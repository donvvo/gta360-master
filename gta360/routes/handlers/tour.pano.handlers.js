/**
 * Created by andrewjjung on 2017-02-28.
 */

var fs = require('fs');

var AWS = require('aws-sdk'),
  s3 = new AWS.S3({region: 'us-east-1', apiVersion: '2006-03-01'})
var formidable = require('formidable')
var mime = require('mime')

var Tour = require('../../models/tours');


module.exports = {
  showPanoEditPage: function(req, res, next) {
    findTourByTourIdParam(req, next, function(tour) {
         var backUrl = `/tour/${tour._id}/edit#VirtualTour`

        res.render('tours/virtual_tour_edit', { tour: tour, backUrl: backUrl });
    })
  },
  editPanoUrl: function (req, res, next) {
    findTourByTourIdParam(req, next, function(tour) {
      tour.panoTour.code = req.body.panoTourCode

      tour.save(function (err, tour) {
        if (err) return next(err);

        return res.redirect(`/tour/${tour._id}/edit/virtual-tour/edit`);
      });
    })
  },
  panoThumbnail: function (req, res, next) {
    findTourByTourIdParam(req, next, function (tour) {
      return res.render('tours/virtual_tour/virtual_tour_thumbnail_upload', {
        layout: null,
        tour: tour,
        url: req.originalUrl
      });
    })
  },
  editPanoThumbnail: function (req, res, next) {
    findTourByTourIdParam(req, next, function(tour) {
      var form = new formidable.IncomingForm();
      form.parse(req, function(err, fields, files) {
        if (err) return next(err);

        var image = files.thumbnailPhoto

        var imageName = `panothumbnails/${Date.now()}_${image.name}`
        var imageBody = fs.createReadStream(image.path)

        var thumbnailData = {
          Bucket: '360gta-media',
          Key: imageName,
          Body: imageBody,
          ContentType: mime.lookup(imageName)
        }

        var mainRes = res

        s3.upload(thumbnailData, function(err, res) {
          if (err) return next(err)

          tour.panoTour.thumbnail = `http://s3.amazonaws.com/360gta-media/${imageName}`

          tour.save(function(err) {
            if (err) return next(err)

            mainRes.redirect(`/tour/${tour._id}/edit/virtual-tour/edit`)
          })
        })
      });
    })
  },
  virtualTourPopup: function(req, res, next) {
    findTourByTourIdParam(req, next, function(tour) {
      res.render('tours/virtual_tour/virtual_tour_popup', {
        layout: null,
        tour: tour
      });
    })
  }
}

function findTourByTourIdParam(req, next, successHandler) {
  return Tour.findOne({'_id': req.params.tour_id})
    .exec()
    .then(function(tour) {
      if (!tour) return next()

      successHandler(tour)
    })
    .catch(function(err) {
      if (err.name == 'CastError') {
        return next()
      }
      next(err)
    })
}
