 $(document).ready(function(){
   $('.datetime-picker').datetimepicker({
     step: 30
   });
   $('.time-picker').datetimepicker({
     datepicker: false,
     format: 'H:i',
     step: 30
   })

   jQuery('.revolution-slider-video').revolution({
     delay:15000,
     hideThumbs:10,
     fullWidth:"on",
     fullScreen:"on",
     fullScreenOffsetContainer: "",
     touchenabled:"on",
     navigationType:"none",
     dottedOverlay:"",
     videoJsPath: "rs-plugin/videojs/"
   });

   jQuery('.revolution-sub-slider').revolution({
     delay:15000,
     startwidth:1170,
     startheight:$(window).height() * 0.6,
     hideThumbs:10,
     autoHeight: "off",
     fullWidth:"off",
     fullScreen:"off",
     fullScreenOffsetContainer: "",
     touchenabled:"on",
     navigationType:"none",
     dottedOverlay:""
   });

   $("input.postal-code").mask('ADA DAD', {
     'translation': {
       A: {pattern: /[A-Za-z]/},
       D: {pattern: /[0-9]/},
     }, onKeyPress: function (value, event) {
       event.currentTarget.value = value.toUpperCase()
     }})
   $("input.offer-price").mask('$ZZZ,ZZZ,OOO', {
     'translation': {
       Z: {pattern: /[0-9]/, optional: true},
       O: {pattern: /[0-9]/}
     }})
   $("input.telephone").mask('(OOO) OOO-OOOO', {
     'translation': {
       O: {pattern: /[0-9]/}
     }})

   jQuery('form .disabled input').attr('disabled', true)

   // Checkbox associated input boxes are disabled until checkbox is checked

   var associatedCheckBoxCheckHandler = function($checkbox) {
     var $inputBox = $($checkbox.data('inputbox'))

     if ($checkbox.prop('checked')) {
       $inputBox.prop('disabled', false)
     }
     else {
       $inputBox.prop('disabled', true)
     }
   }

   // Initialize
   ;(function() {
     var $checkboxes = $('.associated-checkbox')
     $checkboxes.on('click', function(event) {
        associatedCheckBoxCheckHandler($(this))
     })
     $checkboxes.each(function(index, checkbox) {
       associatedCheckBoxCheckHandler($(checkbox))
     })
   }) ()

   var $packagesSelection = $('#packages-selection')
   if ($packagesSelection) {
     // Calculate the price of a tour
     const pricing = {
       photo: {
         small_photo: 99.99,
         medium_photo: 149.99,
         large_photo: 199.99
       },
       video: {
         small_video: 149.99,
         medium_video: 199.99,
         large_video: 249.99
       },
       matterport: {
         small_matterport: 199.99,
         medium_matterport: 299.99,
         large_matterport: 399.99
       },
       aerial: {
         small_aerial: 149.99,
         medium_aerial: 199.99,
       },
       twilight_photo: 49.99,
       rush_service: 59.99,
       agent_video: 99.99,
       social_media_video: 99.99
     }

     var calculateTourPrice = function(selectedPackages) {
       return (pricing.photo[selectedPackages.photo] || 0.00) +
         (pricing.video[selectedPackages.video] || 0.00) +
         (pricing.matterport[selectedPackages.matterport] || 0.00) +
         (pricing.aerial[selectedPackages.aerial] || 0.00) +
         calculateAdditionalServices(selectedPackages)
     }

     var calculateAdditionalServices = function(selectedPackages) {
       var additionalServicesTotal = 0

       selectedPackages.additionalServices.forEach(function(element) {
         additionalServicesTotal += (pricing[element] || 0) * ((element === 'twilight_photo') ?
             $('input[name=twilight_photo_quantity]').val() : 1)
       })

       return additionalServicesTotal
     }

     function getSelectedPackages() {
       var selectedPackages = {}

       selectedPackages.photo = $('input[name=HQ_photo]:checked').val()
       selectedPackages.video = $('input[name=HD_video]:checked').val()
       selectedPackages.matterport = $('input[name=matterport_tour]:checked').val()
       selectedPackages.aerial = $('input[name=aerial_photo_video]:checked').val()

       selectedPackages.additionalServices =
         $.map($('input[name=additional_services]:checked'), function(element) { return $(element).val() })

       return selectedPackages
     }

     var $packagesTotalPrice = $('#packages-total-price')
     var $tourDiscount = $('#packages-discount')
     var $hst = $('#hst')
     var $tourTotalPrice = $('#tour-total-price')

     var $tourDiscountRow = $('#tour-discount-row')

     var calculateAndDisplayTourPrice = function() {
       var selectedPackages = getSelectedPackages()

       var tourDiscountVal = ($('input[name=tour_discount]').val() || 0)
       if (tourDiscountVal) {
         $tourDiscountRow.css('display', 'block')
       }
       else {
         $tourDiscountRow.css('display', 'none')
       }

       var packagesTotalPrice = +(calculateTourPrice(selectedPackages).toFixed(2))
       var tourDiscount = +((packagesTotalPrice * tourDiscountVal / 100).toFixed(2))
       var hst = +(((packagesTotalPrice - tourDiscount) * 0.13).toFixed(2))
       var tourTotalPrice = +(packagesTotalPrice - tourDiscount + hst).toFixed(2)

       $packagesTotalPrice.text(packagesTotalPrice.toFixed(2))
       $tourDiscount.text(tourDiscount.toFixed(2))
       $hst.text(hst.toFixed(2))
       $tourTotalPrice.text(tourTotalPrice.toFixed(2))
     }

     $packagesSelection.find('input').change(function() {
        calculateAndDisplayTourPrice()
     })

     calculateAndDisplayTourPrice()
   }

   // Virtual tour
   function initializeVirtualTourSlider() {
     $('.virtual-tour-thumbnail-slider').revolution({
       delay:15000,
       startwidth:1000,
       startheight:500,
       hideThumbs:10,
       fullWidth:"on",
       fullScreenOffsetContainer: "",
       touchenabled:"on",
       navigationType:"none",
       dottedOverlay:""
     });
   }
   initializeVirtualTourSlider()
   $(window).on("orientationchange",function(){
     console.log('rotate')
     initializeVirtualTourSlider()
   });
 });

 // Tour gallery load more
 $(window).load(function() {
   // Gallery load more button.
   var numberOfItemsToShow = 4
   var numberOfGalleryItems = $('#gallery.gallery-tour .item').length
   if (numberOfGalleryItems > numberOfItemsToShow) {
     var $loadMoreButton = $('#LoadMoreButton').show()
     var showIndex = numberOfItemsToShow
     function loadMoreFilter() {
       var number = $(this).data('index');
       return number < showIndex;
     }
     function galleryLoadMore() {
       $('#gallery.gallery-tour').isotope({
         // filter element with numbers greater than 50
         filter: loadMoreFilter
       })
       if (showIndex >= numberOfGalleryItems) {
         $loadMoreButton.hide()
       }
       else {
         showIndex += numberOfItemsToShow
       }
     }

     $loadMoreButton.click(function() {
       galleryLoadMore()
     })
     galleryLoadMore()
     console.log('custom')
   }
 })
