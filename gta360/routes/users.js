var fs = require('fs');
var gm = require('gm');

var express = require('express');
var router = express.Router();

var formidable = require('formidable');
var validator = require('validator');

var AWS = require('aws-sdk')
var s3 = new AWS.S3({region: 'us-east-1', apiVersion: '2006-03-01'})
var mime = require('mime')

var User = require('../models/users');
var Tour = require('../models/tours')
var userAuth = require('../lib/userAuth.js')


// Get a list of clients
router.get('/', userAuth.adminOrManager, function(req, res, next) {
  User.find({'user_type': 'CLIENT'}, function(err, user) {
    if (err) return next(err);

    var context = {
      user_list: user
    };

    res.render('users/client_list', context);
  });
})

// Get a list of managers
router.get('/managers', userAuth.adminOnly, function(req, res, next) {
  User.find({'user_type': 'MANAGER'}, function(err, user) {
    if (err) return next(err);

    var context = {
      user_list: user
    };

    res.render('users/manager_list', context);
  });
})

router.get('/settings', userAuth.authenticatedUserOnly, function(req, res, next) {
  res.render('users/settings');
}).post('/settings', userAuth.authenticatedUserOnly, function(req, res, next) {
  var user = req.user

  user.tourNotification = req.body.tour_notify

  user.save(function(err, user) {
    if (err) return next(err)

    return res.render('users/settings', {
      notificationSuccess: 'Your notification settings has been successfully changed'});
  })
})

router.get('/change-password', userAuth.authenticatedUserOnly, function(req, res, next) {
  res.redirect('/user/settings')
}).post('/change-password', userAuth.authenticatedUserOnly, function(req, res, next) {
  var user = req.user

  if (req.body.password != req.body.confirm_password) {
    return res.render('users/settings', {
      error: "Passwords do not match. Please enter the same password."
    })
  }

  user.changePassword(req.body.password, function(err, user) {
    if (err) return next(err)

    return res.render('users/settings', {
      success: 'Your password has been successfully changed. '});
  })
})

router.get('/:user_id', userAuth.authenticatedUserOnly, function(req, res, next) {
  User.findOne({ _id: req.params.user_id }, function(err, user) {
    if (err) return next(err);
    
    Tour.find({ creator: user._id }, function(err, tours) {
      if (err) return next(err)

      tours.forEach(function(tour) {
        tour.isTourAdminAssignedManagerOrSelf = userAuth.isTourAdminAssignedManagerOrSelf(req, tour)
      })

      var context = {
        profile_user: user,
        permission: userAuth.isAdminOrSelf(req),
        tours: tours,
        tourPermission: userAuth.isAdminManagerOrSelf(req)
      };

      res.render('users/profile', context);
    })
  });
});

// Code for user management


router.get('/:user_id/edit', userAuth.adminOrSelfOnly, function(req, res, next) {
  User.findOne({ _id: req.params.user_id }, function(err, user) {
    if (err) return next(err);
    
    var user_type = {
      ADMIN: user.user_type === 'ADMIN',
      MANAGER: user.user_type === 'MANAGER',
      CLIENT: user.user_type === 'CLIENT'
    }

    var context = {
      url: req.originalUrl,
      profile_user: user,
      user_type: user_type,
      permission: userAuth.isAdmin(req)
    };

    res.render('users/profile_edit', context);
  });
}).post('/:user_id/edit', userAuth.adminOrSelfOnly, function(req, res, next) {
  User.findOne({ _id: req.params.user_id }, function(err, user) {
    if (err) return next(err);
    
    var first_name = req.body.first_name,
      last_name = req.body.last_name;

    var validation_err = first_name || last_name;
    if (!validation_err) {
      return next(new Error('Form fields validation error.'));
    }

    user.name.first_name = first_name;
    user.name.last_name = last_name;
    user.title = req.body.title
    user.brokerage = req.body.brokerage
    user.description = req.body.description;
    user.address = req.body.user_address
    user.contact.phone = req.body.phone_number;
    user.website =req.body.website

    if (userAuth.isAdmin(req)) {
      user.user_type = req.body.user_type;
    }

    user.save(function(err, user) {
      if (err) next(err);

      res.redirect('/user/:user_id'.replace(':user_id', user._id)); 
    });
  });
});

router.get('/:user_id/delete', userAuth.adminOnly, function(req, res, next) {
  User.findOne({ _id: req.params.user_id }, function(err, user) {
    if (err) return next(err);
    if (!user) return next()

    var context = {
      profile_user: user,
    };

    res.render('users/account_delete', context);
  });
}).post('/:user_id/delete', userAuth.adminOnly, function(req, res, next) {
  User.findOneAndRemove({ _id: req.params.user_id }, function(err, user) {
    if (err) return next(err);

    res.redirect('/user');
  });
});

router.get('/:user_id/edit/photo', userAuth.adminOrSelfOnly, function(req, res, next) {
  User.findOne({ '_id': req.params.user_id }, function(err, user) {
    if (err) return next(err);

    res.render('users/photo_edit', { 
      layout: null,
      user: user,
      url: req.originalUrl
    });
  });
}).post('/:user_id/edit/photo', userAuth.adminOrSelfOnly, function(req, res, next) {
  User.findOne({ _id: req.params.user_id }, function(err, user) {
    if (err) return next(err);
    if (!user) return next()

    // When photo is changed, discard the old photo.
    // TODO handle when no new photo is uploaded.

    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
      if (err) return next(err);

      var dataDir = process.cwd() + '/public';
      var imageDir = '/media/image';
      var imageFullDir = dataDir + imageDir;
      fs.existsSync(dataDir) || fs.mkdirSync(dataDir);
      fs.existsSync(imageFullDir) || fs.mkdirSync(imageFullDir);

      var image = files.crop_image,
        path,
        image_path;

      if (image) {
        path = imageDir + '/' + Date.now() + image.name;
        image_path = image.path;
      }
      else {
        path = user.picture;
        image_path = dataDir + user.picture;
      } 

      if (!path) {
          res.redirect(req.path);
      }

      gm(image_path).crop(fields.width, fields.height, fields.x_coord, fields.y_coord)
      .write(dataDir + path, function(err) {
        if (err) return next(err);

        user.picture = path;
        user.save(function(err) {
          if (err) return next(err);

          if (req.query.tour) {
            return res.redirect(`/tour/${req.query.tour}/edit#AgentProfile`);
          }
          else {
            return res.redirect('/user/:user_id/edit'.replace(':user_id', user._id));
          }
        });
      });
    });
  });
});

module.exports = router;
