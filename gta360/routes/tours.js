var fs = require('fs');
var gm = require('gm');
var express = require('express');
var router = express.Router();
var validator = require('validator');
var formidable = require('formidable');
var phantom = require('phantom');
var moment = require('moment');
var NodeGeocoder = require('node-geocoder')

var credentials = require('../credentials')
var Utils = require('../utils'), 
  authenticatedUserOnly = Utils.authenticatedUserOnly;
var User = require('../models/users');
var Tour = require('../models/tours');
var userAuth = require('../lib/userAuth.js')
var emailUtils = require('../lib/email')

var tourPanoHandlers = require('./handlers/tour.pano.handlers')


router.get('/list', userAuth.authenticatedUserOnly, function(req, res, next) {
  var tourQueryFilter = Utils.getTourQueryFilterByUserType(req)

  if (req.query.search) {
    var searchRegex = new RegExp(`.*${req.query.search}`)
    tourQueryFilter['$or'] = [
      {'property.name': searchRegex},
      {'creatorName': searchRegex},
      {'managerName': searchRegex}
    ]
  }

  if (req.query.status) {
    tourQueryFilter['status'] = {'$in': req.query.status}
  }

  Tour.find(tourQueryFilter).
    populate('creator').
    exec(function(err, tours) {
    if (err) return next(err);

    tours.forEach(function(tour) {
      tour.isTourAdminAssignedManagerOrSelf = userAuth.isTourAdminAssignedManagerOrSelf(req, tour)
    })

    var request = (req.query.request === 'true')

    res.render('tours/tour_list', { tours: tours, request: request });
  });
});

router.get('/new/:user_id', userAuth.authenticatedUserOnly, function(req, res) {
  res.render('tours/new_tour', {tourScheduleEdit: true, newRequest: true});
}).post('/new/:user_id', userAuth.authenticatedUserOnly, function(req, res, next) {
  User.findOne({'_id': req.params.user_id}, function(err, user) {
    if (err) return next(err)
    if (!user) user = req.user

    var tour_schedule;
    if (req.body.tour_schedule) {
      var date_regex = /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})$/;
      var parsed_date = req.body.tour_schedule.match(date_regex);

      tour_schedule = new Date(parsed_date[1], parsed_date[2] - 1, parsed_date[3], parsed_date[4], parsed_date[5]);
    }


    var tour = new Tour({
      creator: user._id,
      creatorName: user.name.full,
      HQPhotography: req.body.HQ_photo,
      cinematicHDVideography: req.body.HD_video,
      matterportTour: req.body.matterport_tour,
      aerialPhotoVideo: req.body.aerial_photo_video,
      additionalServices: req.body.additional_services,
      twilightPhotoQuantity: req.body.twilight_photo_quantity,
      property: {
        name: req.body.property_name,
        address: {
          street_address: req.body.street_address,
          city: req.body.city,
          province: req.body.province,
          postal_code: req.body.postal_code
        }
      },
      offer_price: req.body.offer_price,
      request_note: req.body.request_note,
      request_date: Date.now(),
      tour_schedule: tour_schedule,
      status: 'REQUESTED',
      agent: {
        name: user.name.full,
        telephone: user.contact.phone,
        email: user.email
      }
    });
    tour.convertAddressToAddressURL()
    tour.save(function(err, tour) {
      if (err) return next(err);

      User.find({'user_type': 'ADMIN'}, function(err, adminUsers) {
        if (err) return next(err)

        var adminEmails = adminUsers.map(function(user) {
          return user.email
        }).join(';')

        var finishFlag = 0

        emailUtils.tourOrder(user.email, tour, function(err, result) {
          if (err) return next('fail')

          finishFlag++

          if (finishFlag === 2) {
            res.redirect('/tour/list?request=true');
          }
        })
        emailUtils.tourOrderAdmin(adminEmails, user, tour, function(err) {
          if (err) return next('fail');

          finishFlag++

          if (finishFlag === 2) {
            res.redirect('/tour/list?request=true');
          }
        })
      })
    });
  })
});

router.get('/:tour_id/slider-edit', userAuth.adminOrManager, function(req, res, next) {
  var tour = Tour.findOne({ '_id': req.params.tour_id }, function(err, tour) {
    if (err) return next(err);
    res.render('tours/slider_edit', {
      layout: null,
      csrf: 'test',
      tour: tour,
      slider_video_checked: tour.slider.slider_type === 'VIDEO',
      url: '/tour/:tour_id/slider-edit'.replace(':tour_id', tour._id)
    });
  });
}).post('/:tour_id/slider-edit', userAuth.adminOrManager, function(req, res, next) {
  Tour.findOne({ _id: req.params.tour_id }, function(err, tour) {
    if (err) throw err;

    var dataDir = process.cwd() + '/public';
    var imageDir = '/media/image';
    var imageFullDir = dataDir + imageDir;
    fs.existsSync(dataDir) || fs.mkdirSync(dataDir);
    fs.existsSync(imageFullDir) || fs.mkdirSync(imageFullDir);

    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
      if (err) return next(err);

      var slider_type = fields.slider_type

      var image = files.crop_image,
        path,
        image_path;

      tour.slider.slider_type = fields.slider_type || 'IMAGE'

      if (slider_type === 'VIDEO') {
        tour.slider.video = fields.slider_video
      }

      if (image.size === 0 && !tour.slider.image) {
        tour.slider.image = ""

        tour.save(function(err) {
          if (err) return next(err);

          return res.redirect('/tour/:tour_id/edit'.replace(':tour_id', tour._id));
        });
      }
      else {
        if (image.size > 0) {
          path = imageDir + '/' + Date.now() + image.name;
          image_path = image.path;
        }
        else {
          image_path = dataDir + tour.slider.image
          path = tour.slider.image
        }

        gm(image_path).crop(Math.round(fields.width), fields.height, fields.x_coord, fields.y_coord)
          .write(dataDir + path, function(err) {
            if (err) return next(err);

            tour.slider.image = path
            tour.save(function(err) {
              if (err) return next(err);

              res.redirect('/tour/:tour_id/edit'.replace(':tour_id', tour._id));
            });
          });
      }
    });
  });
});

router.get('/:tour_id/edit', userAuth.authenticatedUserOnly, function(req, res, next) {
  Tour.findOne({ '_id': req.params.tour_id }).
    populate('creator').
    exec(function(err, tour) {
    if (err) return next(err);

    if (!userAuth.isTourAdminAssignedManagerOrSelf(req, tour)) {
      return next(Utils.raise401Error('Fail isTourAdminAssignedManagerOrSelf'))
    }

    User.findOne({ '_id': tour.manager }, function(err, manager) {
      if (err) return next(err)

      var url = '/tour/:tour_id/edit'.replace(':tour_id', tour._id);
      var tour_status = [{
        name: 'Requested', value: 'REQUESTED', checked: (tour.status === 'REQUESTED')
      }, {
        name: 'Scheduled', value: 'CONFIRMED', checked: (tour.status === 'CONFIRMED')
      }, {
        name: 'Complete', value: 'COMPLETE', checked: (tour.status === 'COMPLETE')
      }];

      var tour_theme = [{
        name: 'Dark', value: 'DARK', checked: (tour.theme === 'DARK')
      }, {
        name: 'White', value: 'WHITE', checked: (tour.theme === 'WHITE')
      }];

      var slider_video_checked = tour.slider.slider_type === 'VIDEO'

      var tourScheduleEdit = !(req.user.user_type === 'CLIENT') || (tour.status === 'REQUESTED')

      var tourDeliverable = (tour.status === 'COMPLETE')

      var deliver = req.query.deliver

      res.render('tours/tour_edit', { tour: tour, url: url, creator: tour.creator, manager: manager,
        tour_status: tour_status, tour_theme: tour_theme, slider_video_checked: slider_video_checked,
        tourScheduleEdit: tourScheduleEdit, tourDeliverable: tourDeliverable, deliver: deliver});
    })
  });
}).post('/:tour_id/edit', userAuth.authenticatedUserOnly, function(req, res, next) {
  Tour.findOne({ '_id': req.params.tour_id }).
  populate('creator').
  exec(function(err, tour) {
    if (err) return next(err);

    // Tour Profile
    if (req.body.tour_profile &&
      (req.body.buttonSection === 'TourProfile' || req.body.buttonSection === 'SaveAll')) {
      tour.property.name = req.body.property_name
      tour.property.address.street_address = req.body.street_address
      tour.convertAddressToAddressURL()
      tour.property.address.city = req.body.city
      tour.property.address.province = req.body.province
      tour.property.address.postal_code = req.body.postal_code
      tour.offer_price = req.body.offer_price

      var old_tour_schedule = tour.tour_schedule
      var tour_schedule = req.body.tour_schedule;
      if (tour_schedule) {
        var date_regex = /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})$/;
        var parsed_date = tour_schedule.match(date_regex);

        tour.tour_schedule = new Date(parsed_date[1], parsed_date[2] - 1, parsed_date[3], parsed_date[4], parsed_date[5]);
      }
      else {
        tour.tour_schedule = null
      }
    }

    // Tour Settings
    if (req.body.tour_settings &&
      (req.body.buttonSection === 'TourSettings' || req.body.buttonSection === 'SaveAll')) {
      tour.HQPhotography = req.body.HQ_photo
      tour.cinematicHDVideography = req.body.HD_video
      tour.matterportTour = req.body.matterport_tour
      tour.aerialPhotoVideo = req.body.aerial_photo_video
      tour.additionalServices = req.body.additional_services
      tour.twilightPhotoQuantity = req.body.twilight_photo_quanity
      tour.request_note = req.body.request_note

      if (req.user.isAdmin) {
        tour.discount = req.body.tour_discount
      }

      var tour_status = req.body.tour_status
      if (tour_status) {
        var oldStatus = tour.status
        tour.status = tour_status
      }
      tour.theme = req.body.tour_theme
    }

    // Property highlights
    if (req.body.property_highlights &&
      (req.body.buttonSection === 'PropertyHighlights' || req.body.buttonSection === 'SaveAll')) {
      tour.highlights.square_feet.display = (req.body.square_feet_display === 'display')
      tour.highlights.square_feet.detail = req.body.square_feet_detail
      tour.highlights.bath.display = (req.body.bath_display === 'display')
      tour.highlights.bath.detail = req.body.bath_detail
      tour.highlights.bedroom.display = (req.body.bedroom_display === 'display')
      tour.highlights.bedroom.detail = req.body.bedroom_detail
      tour.highlights.floors.display = (req.body.floors_display === 'display')
      tour.highlights.floors.detail = req.body.floors_detail
      tour.highlights.inlaw_suite.display = (req.body.inlaw_suite_display === 'display')
      tour.highlights.inlaw_suite.detail = req.body.inlaw_suite_detail
      tour.highlights.car_parking.display = (req.body.car_parking_display === 'display')
      tour.highlights.car_parking.detail = req.body.car_parking_detail
      tour.highlights.locker.display = (req.body.locker_display === 'display')
      tour.highlights.locker.detail = req.body.locker_detail
      tour.highlights.parking.display = (req.body.parking_display === 'display')
      tour.highlights.parking.detail = req.body.parking_detail
      tour.highlights.kitchens.display = (req.body.kitchens_display === 'display')
      tour.highlights.kitchens.detail = req.body.kitchens_detail
      tour.highlights.pool.display = (req.body.pool_display === 'display')
      tour.highlights.pool.detail = req.body.pool_detail
      tour.highlights.basement_apt.display = (req.body.basement_apt_display === 'display')
      tour.highlights.basement_apt.detail = req.body.basement_apt_detail
      tour.highlights.lot_size.display = (req.body.lot_size_display === 'display')
      tour.highlights.lot_size.detail = req.body.lot_size_detail
      tour.highlights.irregular_lot.display = (req.body.irregular_lot_display === 'display')
      tour.highlights.irregular_lot.detail = req.body.irregular_lot_detail
      tour.highlights.ttc.display = (req.body.ttc_display === 'display')
      tour.highlights.ttc.detail = req.body.ttc_detail
      tour.highlights.highway.display = (req.body.highway_display === 'display')
      tour.highlights.highway.detail = req.body.highway_detail
      tour.highlights.parks.display = (req.body.parks_display === 'display')
      tour.highlights.parks.detail = req.body.parks_detail
      tour.highlights.schools.display = (req.body.schools_display === 'display')
      tour.highlights.schools.detail = req.body.schools_detail
      tour.highlights.year_build.display = (req.body.year_build_display === 'display')
      tour.highlights.year_build.detail = req.body.year_build_detail
      tour.highlights.new_build.display = (req.body.new_build_display === 'display')
      tour.highlights.new_build.detail = req.body.new_build_detail
      tour.highlights.custom_build.display = (req.body.custom_build_display === 'display')
      tour.highlights.custom_build.detail = req.body.custom_build_detail
      tour.highlights.ravine_lot.display = (req.body.ravine_lot_display === 'display')
      tour.highlights.ravine_lot.detail = req.body.ravine_lot_detail
    }

    // Virtual tour
    if (req.body.virtual_tour &&
      (req.body.buttonSection === 'VirtualTour' || req.body.buttonSection === 'SaveAll')) {
      tour.display.panoramicImages = (req.body.panoramic_images_section === 'display')
    }

    // Open house section
    if (req.body.open_house_date &&
      (req.body.buttonSection === 'OpenHouseDate' || req.body.buttonSection === 'SaveAll')) {
      tour.display.open_house = (req.body.open_house_section === 'display')

      tour.open_house_date1 = req.body.open_house_date1
      tour.open_house_date1_end = req.body.open_house_date1_end
      tour.open_house_date2 = req.body.open_house_date2
      tour.open_house_date2_end = req.body.open_house_date2_end
      tour.open_house_date3 = req.body.open_house_date3
      tour.open_house_date3_end = req.body.open_house_date3_end
      tour.open_house_date4 = req.body.open_house_date4
      tour.open_house_date4_end = req.body.open_house_date4_end

      tour.open_house_alternate_text = req.body.open_house_alternate_text
    }

    // Offer presentation section
    if (req.body.offer_presentation_date &&
      (req.body.buttonSection === 'OfferPresentationDate' || req.body.buttonSection === 'SaveAll')) {
      tour.display.offer_presentation = (req.body.offer_presentation_section === 'display')

      tour.offer_date = req.body.offer_date

      tour.offer_date_alternate_text = req.body.offer_date_alternate_text
    }

    // Property details
    if (req.body.property_details &&
      (req.body.buttonSection === 'PropertyDetails' || req.body.buttonSection === 'SaveAll')) {
      tour.display.property_details = (req.body.property_details_section === 'display')

      tour.features.description = req.body.feature_description
      tour.features.highlight1 = req.body.feature_highlight1
      tour.features.highlight2 = req.body.feature_highlight2
      tour.features.highlight3 = req.body.feature_highlight3
      tour.features.highlight4 = req.body.feature_highlight4
      tour.features.highlight5 = req.body.feature_highlight5
      tour.features.highlight6 = req.body.feature_highlight6
      tour.features.highlight7 = req.body.feature_highlight7
      tour.features.highlight8 = req.body.feature_highlight8
      tour.features.highlight9 = req.body.feature_highlight9
      tour.features.highlight10 = req.body.feature_highlight10
      tour.features.highlight11 = req.body.feature_highlight11
      tour.features.highlight12 = req.body.feature_highlight12
    }

    // Neighborhood info
    if (req.body.neighborhood_form &&
      (req.body.buttonSection === 'Neighborhood' || req.body.buttonSection === 'SaveAll')) {
      tour.display.neighborhood = (req.body.neighborhood_section === 'display')

      tour.neighborhood.description = req.body.neighborhood_description
      tour.neighborhood.highlight1 = req.body.neighborhood_highlight1
      tour.neighborhood.highlight2 = req.body.neighborhood_highlight2
      tour.neighborhood.highlight3 = req.body.neighborhood_highlight3
      tour.neighborhood.highlight4 = req.body.neighborhood_highlight4
    }

    // Agent profile
    if (req.body.agent_profile &&
      (req.body.buttonSection === 'AgentProfile' || req.body.buttonSection === 'SaveAll')) {
      tour.display.agent_info = (req.body.agent_info_section === 'display')
      tour.creator.name.first_name = req.body.first_name;
      tour.creator.name.last_name = req.body.last_name;
      tour.creator.title = req.body.title
      tour.creator.brokerage = req.body.brokerage
      tour.creator.description = req.body.description;
      tour.creator.address = req.body.user_address
      tour.creator.contact.phone = req.body.phone_number;
      tour.creator.website =req.body.website
    }


    var save = function(tour) {
      tour.creator.save(function(err, creator) {
        if (err) return next(err)

        tour.save(function(err, tour) {
          if (err) return next(err);

          var successUrl = `/tour/${tour._id}/edit#${req.body.buttonSection}`

          if (oldStatus && (oldStatus !== tour.status)) {
            if (tour.status === 'COMPLETE') {
              User.find({'user_type': 'ADMIN'}, function(err, adminUsers) {
                if (err) return next(err)

                var adminEmails = adminUsers.map(function(user) {
                  return user.email
                }).join(';')

                emailUtils.tourComplete(adminEmails, tour, function(err, result) {
                  if (err) return next(err)

                  return res.redirect(successUrl);
                })
              })
            }
            else if (tour.status === 'CONFIRMED') {
              emailUtils.tourScheduled(tour.creator.email, tour, function(err, result) {
                if (err) return next(err)

                User.find({'user_type': 'ADMIN'}, function(err, adminUsers) {
                  if (err) return next(err)

                  var adminEmails = adminUsers.map(function(user) {
                    return user.email
                  }).join(';')


                  console.log('tourScheduledAdmin outside')
                  emailUtils.tourScheduledAdmin(adminEmails, tour, function(err, result) {
                    console.log('tourScheduledAdmin')
                    if (err) return next(err)

                    return res.redirect(successUrl);
                  })
                })
              })

            }
            else {
              return res.redirect(successUrl);
            }
          }
          // Email notification for tour reschedule when status is CONFIRMED
          else if (req.body.tour_profile &&
            (req.body.buttonSection === 'TourProfile' || req.body.buttonSection === 'SaveAll') &&
            tour.status == 'CONFIRMED' && moment(tour.tour_schedule).isValid() &&
            !moment(old_tour_schedule).isSame(tour.tour_schedule)) {
            emailUtils.tourScheduled(tour.creator.email, tour, function(err, result) {
              if (err) return next(err)

              User.find({'user_type': 'ADMIN'}, function(err, adminUsers) {
                if (err) return next(err)

                var adminEmails = adminUsers.map(function(user) {
                  return user.email
                }).join(';')


                console.log('tourScheduledAdmin outside 2')
                emailUtils.tourScheduledAdmin(adminEmails, tour, function(err, result) {
                  console.log('tourScheduledAdmin 2')
                  if (err) return next(err)

                  return res.redirect(successUrl);
                })
              })
            })
          }
          else {
            res.redirect(successUrl);
          }
        });
      })
    }

    if (req.body.tour_profile &&
    (req.body.buttonSection === 'TourProfile' || req.body.buttonSection === 'SaveAll')) {
      var geocoder = NodeGeocoder({
        provider: 'google',
        httpAdapter: 'https',
        apiKey: credentials.google.serverApiKey,
        formatter: null
      })

      geocoder.geocode(tour.property.full_address)
        .then(function(res) {
          tour.neighborhood.lat = res[0].latitude
          tour.neighborhood.lng = res[0].longitude

          save(tour)
        })
        .catch(function(err) {
          console.log(err)

          save(tour)
        })
    }
    else{
      save(tour)
    }
  });
});

router.get('/:tour_id/delete', userAuth.adminOnly, function(req, res, next) {
  Tour.findOne({ _id: req.params.tour_id }, function(err, tour) {
    if (err) return next(err);
    if (!tour) return next()

    res.render('tours/tour_delete', {tour: tour});
  });
}).post('/:tour_id/delete', userAuth.adminOnly, function(req, res, next) {
  Tour.findOneAndRemove({ _id: req.params.tour_id }, function(err, tour) {
    if (err) return next(err);

    res.redirect('/tour/list');
  });
});

router.get('/:tour_id/edit/property-photo', userAuth.authenticatedUserOnly, function(req, res, next) {
  Tour.findOne({ '_id': req.params.tour_id }, function(err, tour) {
    if (err) return next(err);
    if (!tour) return next()

    res.render('tours/property_photo', { layout: null, url: req.originalUrl });
  });
}).post('/:tour_id/edit/property-photo', userAuth.authenticatedUserOnly, function(req, res, next) {
  Tour.findOne({ '_id': req.params.tour_id }, function(err, tour) {
    if (err) return next(err);
    if (!tour) return next()

    var dataDir = process.cwd() + '/public';
    var imageDir = '/media/image';
    var imageFullDir = dataDir + imageDir;
    fs.existsSync(dataDir) || fs.mkdirSync(dataDir);
    fs.existsSync(imageFullDir) || fs.mkdirSync(imageFullDir);

    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
      if (err) return next(err);

      var image = files.crop_image,
        path,
        image_path;

      if (image) {
        path = imageDir + '/' + Date.now() + image.name;
        image_path = image.path;
      }
      else {
        return next(new Error('No image is uploaded.'));
      }

      gm(image_path).crop(fields.width, fields.height, fields.x_coord, fields.y_coord)
      .write(dataDir + path, function(err) {
        if (err) return next(err);

        tour.property.image = path;
        tour.save(function(err) {
          if (err) return next(err);

          res.redirect(`/tour/${tour._id}/edit#PropertyDetails`);
        });
      });
    });
  });
});

router.get('/:tour_id/edit/manager', userAuth.adminOnly, function(req, res, next) {
  User.find({'user_type': 'MANAGER'}, function(err, managers) {
    if (err) return next(err);

    res.render('tours/tour_manager_assignment', { user_list: managers });
  });
}).post('/:tour_id/edit/manager', userAuth.adminOnly, function(req, res, next) {
  Tour.findOne({ '_id': req.params.tour_id }, function(err, tour) {
    if (err) return next(err)
    if (!tour) return next()

    var managerId = req.body.managerId

    User.findOne({'_id': managerId, 'user_type': 'MANAGER'}, function(err, user) {
      if (err) return next(err)
      if (!user) return next(new Error('Invalid ID provided for manager assignment.'))

      tour.manager = managerId
      tour.managerName = user.name.full

      tour.save(function(err, tour) {
        if (err) return next(err)

        emailUtils.tourAssigned(user.email, function(err) {
          if (err) return next(err)

          res.redirect(`/tour/${req.params.tour_id}/edit`)
        })
      })
    })
  })
});

router.get('/:tour_id/edit/agent-photo', userAuth.authenticatedUserOnly, function(req, res, next) {
  Tour.findOne({ '_id': req.params.tour_id }, function(err, tour) {
    if (err) return next(err);
    if (!tour) return next()

    res.render('tours/property_photo', { layout: null, url: req.originalUrl });
  });
}).post('/:tour_id/edit/agent-photo', userAuth.authenticatedUserOnly, function(req, res, next) {
  var tour = Tour.findOne({ '_id': req.params.tour_id }, function(err, tour) {
    if (err) return next(err);

    var dataDir = process.cwd() + '/public';
    var imageDir = '/media/image';
    var imageFullDir = dataDir + imageDir;
    fs.existsSync(dataDir) || fs.mkdirSync(dataDir);
    fs.existsSync(imageFullDir) || fs.mkdirSync(imageFullDir);

    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
      if (err) return next(err);

      var image = files.crop_image,
        path,
        image_path;

      if (image) {
        path = imageDir + '/' + Date.now() + image.name;
        image_path = image.path;
      }
      else {
        return next(new Error('No image is uploaded.'));
      }

      gm(image_path).crop(fields.width, fields.height, fields.x_coord, fields.y_coord)
        .write(dataDir + path, function(err) {
          if (err) return next(err);

          tour.agent.profile_picture = path;
          tour.save(function(err) {
            if (err) return next(err);
            res.redirect('/tour/:tour_id/edit'.replace(':tour_id', tour._id));
          });
        });
    });
  });
});

router.get('/:tour_id/edit/neighbor-photo', userAuth.adminOrManager, function(req, res, next) {
  var tour = Tour.findOne({ '_id': req.params.tour_id }, function(err, tour) {
    if (err) return next(err);

    res.render('tours/neighbor_photo', { layout: null, url: req.originalUrl });
  });
}).post('/:tour_id/edit/neighbor-photo', userAuth.adminOrManager, function(req, res, next) {
  var tour = Tour.findOne({ '_id': req.params.tour_id }, function(err, tour) {
    if (err) return next(err);

    var dataDir = process.cwd() + '/public';
    var imageDir = '/media/image';
    var imageFullDir = dataDir + imageDir;
    fs.existsSync(dataDir) || fs.mkdirSync(dataDir);
    fs.existsSync(imageFullDir) || fs.mkdirSync(imageFullDir);

    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
      if (err) return next(err);

      var image = files.crop_image,
        path,
        image_path;

      if (image) {
        path = imageDir + '/' + Date.now() + image.name;
        image_path = image.path;
      }
      else {
        return next(new Error('No image is uploaded.'));
      }

      gm(image_path).crop(fields.width, fields.height, fields.x_coord, fields.y_coord)
      .write(dataDir + path, function(err) {
        if (err) return next(err);

        tour.neighborhood.photo = path;
        tour.save(function(err) {
          if (err) return next(err);
          res.redirect('/tour/:tour_id/edit'.replace(':tour_id', tour._id));
        });
      });
    });
  });
});

router.get('/:tour_id/virtual-tour', tourPanoHandlers.virtualTourPopup)

router.get('/:tour_id/edit/virtual-tour/edit', userAuth.adminOrManager, tourPanoHandlers.showPanoEditPage)
  .post('/:tour_id/edit/virtual-tour/edit', userAuth.adminOrManager, tourPanoHandlers.editPanoUrl)

router.get('/:tour_id/edit/virtual-tour/edit/thumbnail', userAuth.adminOrManager, tourPanoHandlers.panoThumbnail)
  .post('/:tour_id/edit/virtual-tour/edit/thumbnail', userAuth.adminOrManager, tourPanoHandlers.editPanoThumbnail);

router.get('/:tour_id/edit/virtual-tour/add', userAuth.adminOrManager, function(req, res, next) {
  var tour = Tour.findOne({ '_id': req.params.tour_id }, function(err, tour) {
    if (err) return next(err);

    res.render('tours/gallery_photo_upload', { layout: null, url: req.originalUrl, virtualTourAdd: true });
  });
}).post('/:tour_id/edit/virtual-tour/add', userAuth.adminOrManager, function(req, res, next) {
  var tour = Tour.findOne({ '_id': req.params.tour_id }, function(err, tour) {
    if (err) return next(err);

    var dataDir = process.cwd() + '/public';
    var imageDir = '/media/image';
    var imageFullDir = dataDir + imageDir;
    fs.existsSync(dataDir) || fs.mkdirSync(dataDir);
    fs.existsSync(imageFullDir) || fs.mkdirSync(imageFullDir);

    var form = new formidable.IncomingForm();
    form.multiples = true
    form.parse(req, function(err, fields, files) {
      if (err) return next(err);

      var images = files.galleryPhotos

      if (images) {
        if (!images.length) {
          images = [images]
        }
        var numFiles = images.length
        var counter = 0
        var errorFlag = false

        for (var i = 0; i < numFiles; i++) {
          if (!errorFlag) {
            (function(image) {
              var path = `${imageDir}/${Date.now()}_${image.name}`
              fs.rename(image.path, dataDir + path, function(err) {
                if (err) {
                  if (errorFlag) {
                    return
                  }
                  else {
                    errorFlag = true
                    return next(err)
                  }
                }

                tour.panoramicImages.push({ photo: path });
                counter++

                if (counter === numFiles) {
                  tour.save(function(err) {
                    if (err) return next(err);

                    return res.redirect('/tour/:tour_id/edit/virtual-tour/edit'.replace(':tour_id', tour._id));
                  });
                }
              })
            }) (images[i])
          }
        }
      }
      else {
        return next(new Error('No image is uploaded.'));
      }
    });
  });
});

router.get('/:tour_id/edit/gallery/edit', userAuth.adminOrManager, function(req, res, next) {
  Tour.findOne({ '_id': req.params.tour_id }, function(err, tour) {
    if (err) return next(err);

    var backUrl = `/tour/${tour._id}/edit#TourGallery`

    res.render('tours/gallery_photo_edit', { tour: tour, backUrl: backUrl });
  })
}).post('/:tour_id/edit/gallery/edit', userAuth.adminOrManager, function(req, res, next) {
  Tour.findOne({ '_id': req.params.tour_id }, function(err, tour) {
    if (err) return next(err);

    for (var i = 0; i < tour.gallery.length; i++) {
      tour.gallery[i].name = req.body[`name_${i}`]
      tour.gallery[i].priority = req.body[`priority_${i}`]
    }

    var deleteIndexes = req.body.deletePhoto || []
    if (!Array.isArray(deleteIndexes)) {
      deleteIndexes = [deleteIndexes]
    }

    deleteIndexes.sort().reverse().forEach(function(index) {
      tour.gallery[index].remove()
    })

    // Sort alphabetically for now.
    /* var nameOrderMap = {
      'Kitchen': 1,
      'Bathroom': 2,
      'Bedroom': 3
    } */
    tour.gallery.sort(function(a, b) {
      /*
      var aOrder = nameOrderMap[a.name]
      var bOrder = nameOrderMap[b.name]

      if (aOrder < bOrder) {
        return -1
      }
      else if (bOrder < aOrder) {
        return 1
      }
      else {
        if (a.priority > b.priority) {
          return -1
        }
        else if (a.priority < b.priority) {
          return 1
        }

        return 0
      } */

      return (a.priority < b.priority) ? -1 : (a.priority > b.priority) ? 1 : 0
    })

    tour.save(function(err, tour) {
      if (err) return next(err)

      var backUrl = `/tour/${tour._id}/edit#TourGallery`

      res.redirect(`/tour/${tour._id}/edit/gallery/edit`);
    })
  })
})

router.get('/:tour_id/edit/gallery/add', userAuth.adminOrManager, function(req, res, next) {
  var tour = Tour.findOne({ '_id': req.params.tour_id }, function(err, tour) {
    if (err) return next(err);

    res.render('tours/gallery_photo_upload', { layout: null, url: req.originalUrl });
  });
}).post('/:tour_id/edit/gallery/add', userAuth.adminOrManager, function(req, res, next) {
  var tour = Tour.findOne({ '_id': req.params.tour_id }, function(err, tour) {
    if (err) return next(err);

    var dataDir = process.cwd() + '/public';
    var imageDir = '/media/image';
    var imageFullDir = dataDir + imageDir;
    fs.existsSync(dataDir) || fs.mkdirSync(dataDir);
    fs.existsSync(imageFullDir) || fs.mkdirSync(imageFullDir);

    var form = new formidable.IncomingForm();
    form.multiples = true
    form.parse(req, function(err, fields, files) {
      if (err) return next(err);

      var images = files.galleryPhotos

      if (images) {
        if (!images.length) {
          images = [images]
        }
        var numFiles = images.length
        var counter = 0
        var errorFlag = false

        for (var i = 0; i < numFiles; i++) {
          if (!errorFlag) {
            (function(image) {
              var path = `${imageDir}/${Date.now()}_${image.name}`
              fs.rename(image.path, dataDir + path, function(err) {
                if (err) {
                  if (errorFlag) {
                    return
                  }
                  else {
                    errorFlag = true
                    return next(err)
                  }
                }

                tour.gallery.push({ photo: path });
                counter++

                if (counter === numFiles) {
                  tour.save(function(err) {
                    if (err) return next(err);

                    return res.redirect('/tour/:tour_id/edit/gallery/edit'.replace(':tour_id', tour._id));
                  });
                }
              })
            }) (images[i])
          }
        }
      }
      else {
        return next(new Error('No image is uploaded.'));
      }
    });
  });
});

router.get('/:tour_id/edit/gallery/:item_index', userAuth.adminOrManager, function(req, res, next) {
  Tour.findOne({ '_id': req.params.tour_id }, function(err, tour) {
    if (err) return next(err);
    
    var item = tour.gallery[req.params.item_index];
    var url = '/tour/:tour_id/edit/gallery/:item_index'.replace(':tour_id', tour._id)
    .replace(':item_index', req.params.item_index);

    res.render('tours/gallery_photo', { layout: null, item: item, edit_item: true, url: url });
  });
}).post('/:tour_id/edit/gallery/:item_index', userAuth.adminOrManager, function(req, res, next) {
  Tour.findOne({ '_id': req.params.tour_id }, function(err, tour) {
    if (err) return next(err);
    
    if (req.body.delete_button) {
      tour.gallery.splice(req.params.item_index, 1);
    }
    else if (req.body.save_button) {
      tour.gallery[req.params.item_index].title = req.body.item_title;
    }

    tour.save(function(err, tour) {
      if (err) return next(err);

      res.redirect('/tour/:tour_id/edit'.replace(':tour_id', tour._id));
    });
  });
});

router.get('/:tour_id/gallery/:item_index', userAuth.authenticatedUserOnly, function(req, res, next) {
  Tour.findOne({ '_id': req.params.tour_id }, function(err, tour) {
    if (err) return next(err);
    
    var item = tour.gallery[req.params.item_index];
    var url = '/tour/:tour_id/gallery/:item_index'.replace(':tour_id', tour._id)
    .replace(':item_index', req.params.item_index);

    res.render('tours/gallery_photo', { layout: null, item: item, edit_item: false, url: url });
  });
});

router.get('/:tour_id/edit/subslider', userAuth.authenticatedUserOnly, function(req, res, next) {
  var tour = Tour.findOne({ '_id': req.params.tour_id }, function(err, tour) {
    if (err) return next(err);
    if (!tour) return next()

    var url = '/tour/:tour_id/edit'.replace(':tour_id', tour._id);

    res.render('tours/subslider_edit', { tour: tour, url: url });
  });
})

router.get('/:tour_id/edit/subslider/add', userAuth.authenticatedUserOnly, function(req, res, next) {
  Tour.findOne({ '_id': req.params.tour_id }, function(err, tour) {
    if (err) return next(err);
    if (!tour) return next()

    res.render('tours/gallery_photo_add', { layout: null, url: req.originalUrl, forSubslider: true });
  });
}).post('/:tour_id/edit/subslider/add', userAuth.authenticatedUserOnly, function(req, res, next) {
  Tour.findOne({ '_id': req.params.tour_id }, function(err, tour) {
    if (err) return next(err);
    if (!tour) return next()

    var dataDir = process.cwd() + '/public';
    var imageDir = '/media/image';
    var imageFullDir = dataDir + imageDir;
    fs.existsSync(dataDir) || fs.mkdirSync(dataDir);
    fs.existsSync(imageFullDir) || fs.mkdirSync(imageFullDir);

    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
      if (err) return next(err);

      var image = files.crop_image,
        path,
        image_path;

      if (image) {
        path = imageDir + '/' + Date.now() + image.name;
        image_path = image.path;
      }
      else {
        return next(new Error('No image is uploaded.'));
      }

      gm(image_path).crop(fields.width, fields.height, fields.x_coord, fields.y_coord)
      .write(dataDir + path, function(err) {
        if (err) return next(err);

        tour.subslider.push(path);
        tour.save(function(err) {
          if (err) return next(err);
          res.redirect('/tour/:tour_id/edit/subslider'.replace(':tour_id', tour._id));
        });
      });
    });
  });
});

router.get('/:tour_id/edit/subslider/:item_index', userAuth.authenticatedUserOnly, function(req, res, next) {
  Tour.findOne({ '_id': req.params.tour_id }, function(err, tour) {
    if (err) return next(err);
    if (!tour) return next()

    var item = tour.subslider[req.params.item_index];
    var url = '/tour/:tour_id/edit/subslider/:item_index'.replace(':tour_id', tour._id)
    .replace(':item_index', req.params.item_index);

    res.render('tours/gallery_photo', { layout: null, item: item, edit_item: true, url: url,
    forSubslider: true });
  });
}).post('/:tour_id/edit/subslider/:item_index', userAuth.authenticatedUserOnly, function(req, res, next) {
  Tour.findOne({ '_id': req.params.tour_id }, function(err, tour) {
    if (err) return next(err);

    if (req.body.delete_button) {
      tour.subslider.splice(req.params.item_index, 1);
    }
    else {
      res.redirect('/tour/:tour_id/edit/slider'.replace(':tour_id', tour._id));
    }

    tour.save(function(err, tour) {
      if (err) return next(err);

      res.redirect('/tour/:tour_id/edit/slider'.replace(':tour_id', tour._id));
    });
  });
});

/* router.get('/:tour_id/edit/panoramic-images', function(req, res, next) {
  var tour = Tour.findOne({ '_id': req.params.tour_id }, function(err, tour) {
    if (err) return next(err);
    if (!tour) return next()

    var url = '/tour/:tour_id/edit'.replace(':tour_id', tour._id);

    res.render('tours/panoramic_images_edit', { tour: tour, url: url });
  });
}) */

router.get('/:tour_id/edit/panoramic-images', userAuth.authenticatedUserOnly, function(req, res, next) {
  Tour.findOne({ '_id': req.params.tour_id }, function(err, tour) {
    if (err) return next(err);
    if (!tour) return next()

    res.render('tours/gallery_photo_add', { layout: null, url: req.originalUrl, forSubslider: true });
  });
}).post('/:tour_id/edit/panoramic-images', userAuth.authenticatedUserOnly, function(req, res, next) {
  Tour.findOne({ '_id': req.params.tour_id }, function(err, tour) {
    if (err) return next(err);
    if (!tour) return next()

    var dataDir = process.cwd() + '/public';
    var imageDir = '/media/image';
    var imageFullDir = dataDir + imageDir;
    fs.existsSync(dataDir) || fs.mkdirSync(dataDir);
    fs.existsSync(imageFullDir) || fs.mkdirSync(imageFullDir);

    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
      if (err) return next(err);

      var image = files.crop_image,
        path,
        image_path;

      if (image) {
        path = imageDir + '/' + Date.now() + image.name;
        image_path = image.path;
      }
      else {
        return next(new Error('No image is uploaded.'));
      }

      gm(image_path).crop(fields.width, fields.height, fields.x_coord, fields.y_coord)
      .write(dataDir + path, function(err) {
        if (err) return next(err);

        tour.panoramicImage = path;
        tour.save(function(err) {
          if (err) return next(err);
          res.redirect('/tour/:tour_id/edit'.replace(':tour_id', tour._id));
        });
      });
    });
  });
});

/* router.get('/:tour_id/edit/panoramic-images/:item_index', function(req, res, next) {
  Tour.findOne({ '_id': req.params.tour_id }, function(err, tour) {
    if (err) return next(err);
    if (!tour) return next()

    var item = tour.panoramicImages[req.params.item_index];
    var url = '/tour/:tour_id/edit/panoramic-images/:item_index'.replace(':tour_id', tour._id)
    .replace(':item_index', req.params.item_index);

    res.render('tours/gallery_photo', { layout: null, item: item, edit_item: true, url: url,
    forSubslider: true });
  });
}).post('/:tour_id/edit/panoramic-images/:item_index', function(req, res, next) {
  Tour.findOne({ '_id': req.params.tour_id }, function(err, tour) {
    if (err) return next(err);

    if (req.body.delete_button) {
      tour.panoramicImages.splice(req.params.item_index, 1);
    }
    else {
      res.redirect('/tour/:tour_id/edit/panoramic-images'.replace(':tour_id', tour._id));
    }

    tour.save(function(err, tour) {
      if (err) return next(err);

      res.redirect('/tour/:tour_id/edit/panoramic-images'.replace(':tour_id', tour._id));
    });
  });
}); */

/* router.get('/:tour_id/pdf', function(req, res, next) {
  Tour.findOne({ '_id': req.params.tour_id }, function(err, tour) {
    if (err) return next(err);
    
    User.findOne({ '_id': tour.agent }, function(err, agent) {
      var url = '/tour/:tour_id'.replace(':tour_id', tour._id);

      var theme_light = (tour.theme === 'White');
      res.render('tours/tour_pdf', { tour: tour, url: url, agent: agent, theme_light: theme_light });
    });
  });
}).get('/:tour_id/pdf/create', function(req, res, next) {
  Tour.findOne({ '_id': req.params.tour_id }, function(err, tour) {
    if (err) return next(err);
    
    phantom.create().then(function(ph) {
      ph.createPage().then(function(page) {
        page.property('viewportSize', { width: 1024, height: 1000 }).then(function() {
          page.open("http://localhost:8080/tour/:tour_id/pdf".replace(':tour_id', tour._id)).then(function(status) {
            setTimeout(function() {
              var dataDir = process.cwd() + '/public';
              var path = '/pdf/:id:now.pdf'.replace(':id', tour._id).replace(':now', Date.now());
              var name = dataDir + path;
              page.render(name).then(function() {
                console.log('Page Rendered');
                ph.exit();

                tour.feature_sheet = path;
                tour.save(function(err, tour) {
                  if (err) next(err); 

                  res.redirect('/tour/:tour_id/edit'.replace(':tour_id', tour._id));
                });
              });
            }, 1000);
          });
        });
      });
    });
  });
}); */

router.get('/:tour_id/vimeo', function(req, res, next) {
  Tour.findOne({ '_id': req.params.tour_id }, function(err, tour) {
    if (err) return next(err);
    if (!tour) return next()

    res.render('tours/vimeo_video', { layout: null, tour: tour });
  });
});

router.post('/:tour_id/contact-form', function(req, res, next) {
  Tour.findOne({'_id': req.params.tour_id}, function(err, tour) {
    if (err) return next(err)
    if (!tour) return next()

    User.findOne({'_id': tour.creator}, function(err, user) {
      if (err) return next(err)
      if (!user) return next(new Error("This tour doesn't have creator"))

      var name = req.body.name
      var email = req.body.email;
      var phone = req.body.phone;
      var message = req.body.message;

      emailUtils.tourContactForm(user.email, tour.property.full_address, email, name, phone, message, function(err) {
        if (err) return res.send('fail');

        return res.send('sent');
      })
    })
  })
})

router.post('/:tour_id/edit/deliver', userAuth.adminOrManager, function(req, res, next) {
  Tour.findOne({ '_id': req.params.tour_id, 'status': {'$in': ['COMPLETE', 'DELIVERED']} }).
  populate('creator').
  exec(function(err, tour) {
    if (err) return next(err);
    if (!tour) return next()

    tour.status = 'DELIVERED'
    tour.save(function(err, tour) {
      if (err) return next(err)

      var email = tour.creator.email

      emailUtils.tourDelivered(email, tour, function(err) {
        if (err) return next(err)

        return res.redirect(`/tour/${tour._id}/edit?deliver=true`)
      })
    })
  });
});

router.get('/:tour_id', userAuth.authenticatedUserOnly, function(req, res, next) {
  if (req.user.user_type === 'CLIENT') {
    return res.render('error', {
      statusCode: "",
      title: "We Are Currently Working On Your Tour",
      message: "We are currently processing your tour. We will notify you as soon as it is completed. " +
      "Please contact us if you have any questions.",
      backToDashboard: true
    })
  }

  Tour.findOne({ '_id': req.params.tour_id, 'status': {'$ne': 'COMPLETE'} }).
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

module.exports = router;
