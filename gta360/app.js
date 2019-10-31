var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');

var credentials = require('./credentials.js');
var routes = require('./routes/index');
var tours = require('./routes/tours');
var users = require('./routes/users');
var User = require('./models/users');

var app = express();

var auth = require('./lib/auth.js')(app, {});

// MongoDB connection using Mongoose
var mongoose = require('mongoose');
var opts = {
  server: {
    socketOptions: {keepAlive: 1}
  }
};
switch(app.get('env')) {
  case 'development':
    mongoose.connect(credentials.mongo.development.connectionString, opts);
    break;
  case 'production':
    mongoose.connect(credentials.mongo.production.connectionString, opts);
    break;
  default:
    throw new Error('Unknown execution environment: ' + app.get('env'));
}
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

// Setup Mongoose session
var MongoSessionStore = require('session-mongoose')(require('connect'));
var sessionStore = new MongoSessionStore({ url: credentials.mongo[app.get('env')].connectionString });
// set up handlebars view engine
var handlebars = require('express-handlebars').create({ 
  defaultLayout: 'main',
  helpers: {
    section: function (name, options) {
      if (!this._sections) this._sections = {};
      this._sections[name] = options.fn(this);
      return null;
    },
    selected: function (variable, optionValue) {
      return (variable === optionValue) ? 'selected' : ''
    },
    checked: function (variable, checkValue) {
      if (Array.isArray(variable)) {
        return (variable.indexOf(checkValue) !== -1) ? 'checked' : ''
      }
      else {
        return (variable === checkValue) ? 'checked' : ''
      }
    }
  }
});
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  resave: false,
  saveUninitialized: false,
  secret: credentials.cookieSecret,
  store: sessionStore
}));
auth.init();
auth.registerRoutes();
app.use(express.static(path.join(__dirname, 'public')));
app.use('/upload', express.static(path.join(__dirname, 'builder/upload')));
app.use(function(req, res, next) {
  res.locals.authenticated = req.isAuthenticated();
  res.locals.user = req.user;
  if (req.user) {
    res.locals.userAdminOrManager = (req.user.user_type === 'ADMIN' ||
    req.user.user_type === 'MANAGER')
    res.locals.userIsAdmin = req.user.user_type === 'ADMIN'
    res.locals.userIsManager = (req.user.user_type === 'MANAGER')
    res.locals.userAdminOrClient = (req.user.user_type === 'ADMIN' ||
    req.user.user_type === 'CLIENT')
  }

  next();
});

app.use('/', routes());
app.use('/tour', tours);
app.use('/user', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

/* // development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    console.log(err);
    console.log(err.stack);
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
} */

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  console.error(err);
  console.error(err.stack);
  res.status(err.status || 500);

  if (err.status === 404) {
    return res.render('error', {
      statusCode: err.status,
      title: "Page Not Found",
      message: "The page you are looking for does not exist. Please double check the URL is correct. " +
      "Perhaps you can return back to the previous page to see you can find what you are looking for."
    })
  }
  else {
    return res.render('error', {
      statusCode: 500,
      title: "Something's Wrong",
      message: "It seems there has been a problem with our server. Please try again and see if it works. " +
      "If the problem persists, please contact us and we will try to resolve this problem as soon as we can."
    });
  }
});

app.set('port', process.env.PORT || 8080)
app.listen(app.get('port'), function() {
  console.log('Express started on http://localhost:' + app.get('port') + '; press Ctrl-C to terminate.');
});
module.exports = app;
