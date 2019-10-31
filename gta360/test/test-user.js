var expect = require('chai').expect;

var User = require('../models/users.js');
var credentials = require('../credentials.js');

// MongoDB connection using Mongoose
var mongoose = require('mongoose');
var opts = {
  server: {
    socketOptions: {keepAlive: 1}
  }
};
mongoose.connect(credentials.mongo.development.connectionString, opts);

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

describe('User', function(){
  describe('#signup()', function() {
    before(function(done) {
      var user = new User({ 'email': 'test@example.com', 'password': 'test' });
      user.save(function (err, user) {
        if (err) throw err;
        done();
      })
    });

    after(function() {
      db.collection('users').removeMany();
    });

    it('should save user when input is valid', function (done) {
      User.signup({ 'email': 'test1@example.com', 'password': 'testpassword' }, function(err, user) {
        if (err) throw err;
        
        expect(user.email).to.equal('test1@example.com');
        expect(user.password).to.be.a('string');
        expect(user.password).to.not.equal('testpassword');

        done();
      });
    });

    it('should not save user with invalid input and produce proper error message', function(done) {
      User.signup({ 'email': 'asdf', 'password': 'test' }, function(err, user) {
        expect(err).to.not.be.a('null');

        expect(err.errors['email'].message).to.equal('Please provide a valid email.');
        done();
      });
    });

    it('should not save user with no email or password', function(done) {
      User.signup({ }, function(err, user) {
        expect(err).to.not.be.a('null');

        expect(err.errors['email'].message).to.equal('Please provide an email.');
        expect(err.errors['password'].message).to.equal('Please provide a password.');

        done();
      });
    });

    it('should not save a user with duplicate email', function(done) {
      User.signup({ 'email': 'test@example.com', 'password': 'test' }, function(err, user) {
        expect(err).to.not.be.a('null');

        expect(err.errors['email'].message).to.equal('This email is already being used. Please provide another email.');

        done();
      });
    });

  });

  describe('#validPassword()', function() {
    before(function(done) {
      User.signup({ 'email': 'test@example.com', 'password': 'test' }, function (err, user) {
        if (err) throw err;
        done();
      })
    });

    after(function() {
      db.collection('users').removeMany();
    });

    it('should only return true for valid password', function(done) {
      var user = User.findOne({ 'email': 'test@example.com' }, function(err, user) {
        if (err) throw err;
        
        if (user === null) {
          console.error('There is no user with this email.')
        }
        user.validPassword('test', function(err, res) {
          if (err) throw err;

          expect(res).to.equal(true);

          user.validPassword('asdf', function(err, res) {
            if (err) throw err;

            expect(res).to.equal(false);

            done();
          });
        });
      });
    });
  });
});
