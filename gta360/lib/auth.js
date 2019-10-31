// Only use local authentication strategy for this app

var User = require('../models/users.js'),
  passport = require('passport'),
  LocalStrategy = require('passport-local').Strategy;


passport.serializeUser(function(user, done) {
  done(null, user._id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    if (err || !user) return done(err, null);

    done(null, user);
  });
});

module.exports = function(app, options) {
  if (!options.successRedirect) {
    options.successRedirect = '/tour';
  }
  if (!options.failureRedirect) {
    options.failureRedirect = '/signin';
  }

  return {
    init: function() {
      passport.use(new LocalStrategy({
        usernameField: 'Email',
        passwordField: 'Password'
      },
      function(email, password, done) {
        User.findOne({ email: email }, function(err, user) {
          if (err) { return done(err); }

          if (!user) {
            return done(null, false, { message: 'Incorrect email.' });
          }

          user.validPassword(password, function(err, res) {
            if (err) { return done(err); }
            if (res) {
              return done(null, user);
            }
            else {
              return done(null, false, { message: 'Incorrect password.' });
            }
          });
        });
      }));
      app.use(passport.initialize());
      app.use(passport.session());
    },
    registerRoutes: function() {
      app.get('/signin', function(req, res, next) {
        res.render('signin', { layout: 'signup', csrf: 'test' });
      }).post('/signin', function(req, res, next) {
        passport.authenticate('local', function(err, user, info) {
          if (err) return next(err)
          if (!user) {
            return res.render('signin', { layout: 'signup', error: info.message})
          }

          req.logIn(user, function(err) {
            if (err) return next(err)
            return res.redirect('/dashboard')
          })
        })(req, res, next)
      });

      app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
      });
    }
  };
};
