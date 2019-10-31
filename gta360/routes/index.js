var fs = require('fs');
var gm = require('gm');
var express = require('express');
var router = express.Router();
var validator = require('validator');
var formidable = require('formidable');
var crypto = require('crypto')

var utils = require('../utils.js')
var User = require('../models/users.js');
var Tour = require('../models/tours.js')
var AdminSettings = require('../models/adminSettings.js')
var userAuth = require('../lib/userAuth.js')
var emailUtils = require('../lib/email')

module.exports = function() {
  /* GET home page. */
  router.get('/', function(req, res, next) {
    AdminSettings.findOne({}, function(err, settings) {
      if (err) return next(err)

      res.render('home', { layout: 'landing', isHome: true, services: settings });
    })
  });

  router.get('/home-pricelist-vimeo', function(req, res, next) {
    res.render('homepage/home_pricelist_vimeo', { layout: null });
  });

  
  router.get('/signup', function(req, res, next) {
    res.render('signup', { layout: 'signup', csrf: 'test', signupPage: true });
  }).post('/signup', function(req, res, next) {
    var email = req.body.Email;
    var password = req.body.Password;

    var formValues = { 
      email: email,
      name: {
        first_name: req.body.first_name,
        last_name: req.body.last_name
      },
      password: password,
      contact: {
        email: email
      }
    };

    if (password != req.body.confirm_password) {
      return res.render('signup', {
        layout: 'signup',
        signupPage: true,
        formValues: formValues,
        error: "Passwords do not match. Please enter the same password."
      })
    }

    User.signup(formValues, function(err, user) {
      if (err) {
        return res.render('signup', {
          layout: 'signup',
          csrf: 'test',
          signupPage: true,
          formValues: formValues,
          error: err
        });
      }

      emailUtils.signUp(user.email, function(err) {
        if (err) return next(err)

        User.find({'user_type': 'ADMIN'}, function(err, adminUsers) {
          if (err) return next(err)

          var adminEmails = adminUsers.map(function(user) {
            return user.email
          }).join(';')

            if (adminEmails.length > 0) {
	      emailUtils.signUpAdmin(adminEmails, user, function(err) {
              if (err) return next(err)

                req.logIn(user, function(err) {
                  if (err) return next(err)

                  return res.redirect('/tour/new/' + user._id);
                })
              })
	    }
        })
      })
    });
  })

  router.post('/contact-form', function(req, res, next) {
    var name = req.body.name
    var email = req.body.email;
    var phone = req.body.phone;
    var message = req.body.message;

    User.find({'user_type': 'ADMIN'}, function(err, users) {
      if (err) return next(err)

      var adminEmails = users.map(function(user) {
        return user.email
      }).join(';')

      emailUtils.homeContactForm(adminEmails, email, name, phone, message, function(err) {
        if (err) return res.send('fail');


        return res.send('sent');
      })
    })
  })

  router.get('/forgot-password', function(req, res, next) {
    res.render('forgot_password', { 'layout': 'signup' })
  }).post('/forgot-password', function(req, res, next) {
    User.findOne({email: req.body.email}, function(err, user) {
      if (err) return next(err)

      if (!user) {
        return res.render('forgot_password', {layout: 'signup',
          error: "There is no user with the email you just provided. Please check if it is the correct email."})
      }

      crypto.randomBytes(20, function(err, buf) {
        if (err) return next(err)

        var token = buf.toString('hex')

        user.resetPasswordToken = token
        user.resetPasswordExpires = Date.now() + 3600000

        user.save(function(err, user) {
          if (err) return next(err)

          emailUtils.resetPassword(user.email, user.resetPasswordToken, function(err) {
            if (err) return next(err)

            return res.render('forgot_password', {layout: 'signup',
              success: "A reset password email has been sent to your account. Please check your email. " +
              "If you do not receive the email within 5 minutes, please contact us."})
          })
        })
      })
    })
  })

  router.get('/reset-password/:password_token', function(req, res, next) {
    User.findOne({resetPasswordToken: req.params.password_token,
      resetPasswordExpires: { '$gt': Date.now()}}, function(err, user) {
      if (err) return next(err)

      if (!user) {
        return res.render('forgot_password', {layout: 'signup',
          error: 'Password reset link is invalid or has expired. Please request a new one.'})
      }

      res.render('password_reset', {layout: 'signup'})
    })
  }).post('/reset-password/:password_token', function(req, res, next) {
    User.findOne({resetPasswordToken: req.params.password_token,
      resetPasswordExpires: { '$gt': Date.now()}}, function(err, user) {
      if (err) return next(err)

      if (!user) {
        return res.render('forgot_password', {layout: 'signup',
          error: 'Password reset link is invalid or has expired. Please request a new one.'})
      }

      if (req.body.password != req.body.confirm_password) {
        return res.render('password_reset', {
          layout: 'signup',
          error: "Passwords do not match. Please enter the same password."
        })
      }

      user.changePassword(req.body.password, function(err, user) {
        if (err) return next(err)

        return res.render('signin', { layout: 'signup',
          success: 'Your password has been successfully changed. Please sign in with your new password.'});
      })
    })
  })

  router.get('/signout', function(req, res) {
    req.logout();
    res.redirect('/');
  });

  router.get('/dashboard', userAuth.authenticatedUserOnly, function(req, res, next) {
    if (req.user.user_type === 'CLIENT') {
      return res.redirect('/tour/list')
    }

    var tourQueryFilter = utils.getTourQueryFilterByUserType(req)
    tourQueryFilter['status'] = 'REQUESTED'

    Tour.find(tourQueryFilter).
    populate('creator').
    exec(function(err, requestedTours) {
      if (err) return next(err);

      requestedTours.forEach(function(tour) {
        tour.isTourAdminAssignedManagerOrSelf = userAuth.isTourAdminAssignedManagerOrSelf(req, tour)
      })

      tourQueryFilter['status'] = 'CONFIRMED'
      Tour.find(tourQueryFilter, function(err, scheduledTours) {
        if (err) return next(err)

        var events = [];
        scheduledTours.forEach(function(tour){
          var start = tour.tour_schedule && tour.tour_schedule.toISOString();
          if (start) {
            events.push({ title: tour.property.name, start: start });
          }
        });

        var request = (req.query.request === 'true')

        res.render('dashboard', { requestedTours: requestedTours, events: JSON.stringify(events),
          request: request});
      })
    });
  });

  router.get('/services', userAuth.adminOnly, function(req, res, next) {
    AdminSettings.findOne({}, function(err, settings) {
      if (err) return next(err)

      res.render('services', { 'services': settings })
    })
  }).post('/services', userAuth.adminOnly, function(req, res, next) {
    AdminSettings.findOne({}, function(err, settings) {
      if (err) return next(err)
      if (!settings) {
        settings = new AdminSettings({})
      }

      settings.videoPackagesPricing.smallPricing = req.body.videoSmall
      settings.videoPackagesPricing.mediumPricing = req.body.videoMedium
      settings.videoPackagesPricing.largePricing = req.body.videoLarge
      settings.photoPackagesPricing.smallPricing = req.body.photoSmall
      settings.photoPackagesPricing.mediumPricing = req.body.photoMedium
      settings.photoPackagesPricing.largePricing = req.body.photoLarge

      settings.save(function(err, settings) {
        if (err) return next(err)

        res.redirect('/services')
      })
    })
  })

  router.get('/:tour_address_url', function(req, res, next) {
    Tour.findOne({ 'property.address.addressURL': req.params.tour_address_url,
      'status': 'DELIVERED'}).
    populate('creator').
    exec(function(err, tour) {
      if (err) return next(err);
      if (!tour) return next()

      var url = '/tour/:tour_id'.replace(':tour_id', tour._id);

      var theme_dark = (tour.theme === 'DARK');

      var slider_video_checked = tour.slider.slider_type === 'VIDEO'

      var numHighlightsDisplayed = 0
      for (var key in tour._doc.highlights) {
        if (tour._doc.highlights[key].display) numHighlightsDisplayed++
      }
      var highlights6Col = (numHighlightsDisplayed === 6)

      res.render('tours/tour', { layout: 'tour_layout', tour: tour,
        url: url, theme_dark: theme_dark, slider_video_checked: slider_video_checked,
        highlights6Col: highlights6Col });
    });
  });

  router.get('/:tour_address_url/mls', function(req, res, next) {
    Tour.findOne({ 'property.address.addressURL': req.params.tour_address_url,
      'status': 'DELIVERED'}).
    populate('creator').
    exec(function(err, tour) {
      if (err) return next(err);
      if (!tour) return next()

      var url = '/tour/:tour_id'.replace(':tour_id', tour._id);

      var theme_dark = (tour.theme === 'DARK');

      var slider_video_checked = tour.slider.slider_type === 'VIDEO'

      var numHighlightsDisplayed = 0
      for (var key in tour._doc.highlights) {
        if (tour._doc.highlights[key].display) numHighlightsDisplayed++
      }
      var highlights6Col = (numHighlightsDisplayed === 6)

      res.render('tours/tour', { layout: 'tour_layout', tour: tour,
        url: url, theme_dark: theme_dark, slider_video_checked: slider_video_checked,
        highlights6Col: highlights6Col, mls: true });
    });
  });

  return router;
};
