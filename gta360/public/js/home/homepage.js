$(document).ready(function(){
  // Magnific Popup for price list
  $('#HQPhotographyGallery').magnificPopup({
    closeOnContentClick: false,
    closeBtnInside: false,
    items: [
      {
        src: '/images/samples/hdr_photo/hdr_1.jpg'
      },
      {
        src: '/images/samples/hdr_photo/hdr_2.jpg'
      },
      {
        src: '/images/samples/hdr_photo/hdr_3.jpg'
      },
      {
        src: '/images/samples/hdr_photo/hdr_4.jpg'
      },
      {
        src: '/images/samples/hdr_photo/hdr_5.jpg'
      },
      {
        src: '/images/samples/hdr_photo/hdr_6.jpg'
      },
      {
        src: '/images/samples/hdr_photo/hdr_7.jpg'
      },
      {
        src: '/images/samples/hdr_photo/hdr_8.jpg'
      },
      {
        src: '/images/samples/hdr_photo/hdr_9.jpg'
      },
      {
        src: '/images/samples/hdr_photo/hdr_10.jpg'
      },
      {
        src: '/images/samples/hdr_photo/hdr_11.jpg'
      },
      {
        src: '/images/samples/hdr_photo/hdr_12.jpg'
      },
      {
        src: '/images/samples/hdr_photo/hdr_13.jpg'
      },
      {
        src: '/images/samples/hdr_photo/hdr_14.jpg'
      },
      {
        src: '/images/samples/hdr_photo/hdr_15.jpg'
      },
      {
        src: '/images/samples/hdr_photo/hdr_16.jpg'
      },
      {
        src: '/images/samples/hdr_photo/hdr_17.jpg'
      },
      {
        src: '/images/samples/hdr_photo/hdr_18.jpg'
      },
      {
        src: '/images/samples/hdr_photo/hdr_19.jpg'
      },
      {
        src: '/images/samples/hdr_photo/hdr_20.jpg'
      },
    ],
    gallery: {
      enabled: true
    },
    type: 'image'
  })
  $('#AerialPhotographyGallery').magnificPopup({
    closeOnContentClick: false,
    closeBtnInside: false,
    items: [
      {
        src: '/images/samples/aerial_photo/aerial.jpg'
      }
    ],
    gallery: {
      enabled: true
    },
    type: 'image'
  })
  $('#TwilightPhotographyGallery').magnificPopup({
    closeOnContentClick: false,
    closeBtnInside: false,
    items: [
      {
        src: '/images/samples/twilight_photo/twilight_1.jpg'
      },
      {
        src: '/images/samples/twilight_photo/twilight_2.jpg'
      },
      {
        src: '/images/samples/twilight_photo/twilight_3.jpg'
      },
      {
        src: '/images/samples/twilight_photo/twilight_4.jpg'
      }
    ],
    gallery: {
      enabled: true
    },
    type: 'image'
  })
  $('#PlayButton a').magnificPopup({
    type: 'ajax',
    alignTop: true,
    overflowY: 'scroll'
  });


  /* Home price list overlay */
  var fadeOpacity = 0.5;

  $('.price-list-overlay').fadeTo(1, fadeOpacity);

  jQuery(".price-item").on("mouseenter", function () {
    jQuery(this).parent().find(".price-list-overlay").stop(true).fadeTo(300, .9);
  }).on("mouseleave", function() {
    $(this).parent().find(".price-list-overlay").stop(true).fadeTo(300, fadeOpacity);
  })

  $('.price-list-overlay').fadeTo(1, fadeOpacity);
})
