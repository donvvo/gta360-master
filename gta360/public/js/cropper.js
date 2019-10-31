$(function () {

  'use strict';

  var console = window.console || { log: function () {} };
  var $image = $('#image');
  var options = {
    dragMode: 'move',
    movable: false,
    zoomable: false,
    rotatable: false,
    viewMode: 1,
    toggleDragModeOnDblclick: false,
    autoCropArea: 1
  };

  // Gallery photo ratio to be 3:2
  $('#crop-form').hasClass('add-gallery-photo') && (options.aspectRatio = 3 / 2);

  // Profile photo ratio to be 1:1
  $('#crop-form').hasClass('profile-picture') && (options.aspectRatio = 1)

  // Tooltip
  $('[data-toggle="tooltip"]').tooltip();


  // Cropper
  $image.cropper(options);


  // Methods
  $('.docs-buttons').on('click', '[data-method]', function () {
    var $this = $(this);
    var data = $this.data();
    var $target;
    var result;

    if ($this.prop('disabled') || $this.hasClass('disabled')) {
      return;
    }

    if ($image.data('cropper') && data.method) {
      data = $.extend({}, data); // Clone a new one

      if (typeof data.target !== 'undefined') {
        $target = $(data.target);

        if (typeof data.option === 'undefined') {
          try {
            data.option = JSON.parse($target.val());
          } catch (e) {
            console.log(e.message);
          }
        }
      }

      result = $image.cropper(data.method, data.option, data.secondOption);

      if ($.isPlainObject(result) && $target) {
        try {
          $target.val(JSON.stringify(result));
        } catch (e) {
          console.log(e.message);
        }
      }

    }
  });

  // Import image
  var $inputImage = $('#inputImage');
  var URL = window.URL || window.webkitURL;
  var blobURL;

  if (URL) {
    $inputImage.change(function () {
      var files = this.files;
      var file;

      if (!$image.data('cropper')) {
        return;
      }

      if (files && files.length) {
        file = files[0];

        if (/^image\/\w+$/.test(file.type)) {
          blobURL = URL.createObjectURL(file);
          $image.one('built.cropper', function () {

            // Revoke when load complete
            URL.revokeObjectURL(blobURL);
          }).cropper('reset').cropper('replace', blobURL);
        } else {
          window.alert('Please choose an image file.');
        }
      }
    });
  } else {
    $inputImage.prop('disabled', true).parent().addClass('disabled');
  }

  $('#submit').click(function() {
    var result = $image.cropper('getData', true);
    $('#width').val(result.width);
    $('#height').val(result.height);
    $('#x_coord').val(result.x);
    $('#y_coord').val(result.y);
    $('#crop-form').submit();
  }); 
  $('#crop-form').validate();
  /*  $('#crop-form').validate({
    submitHandler: function(form) {
      var result = $image.cropper('getData');
      $('#width').val(result.width);
      $('#height').val(result.height);
      $('#x_coord').val(result.x);
      $('#y_coord').val(result.y);
      form.submit();
    } 
    });*/
});
