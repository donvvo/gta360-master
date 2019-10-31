/**
 * Created by andrewjjung on 2016-09-27.
 */

$("#gallery-photo-input").fileinput({
  maxFileCount: 50,
  maxFileSize: 5000,
});

$("#panoramic-photo-input").fileinput({
  maxFileCount: 10,
  maxFileSize: 10000,
});

$("#virtual-tour-thumbnail-input").fileinput({
  maxFileCount: 1,
  maxFileSize: 5000,
});
