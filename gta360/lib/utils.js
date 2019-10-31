// Photo upload using Cropit
exports.uploadImage = function() {
  var dataDir = process.cwd() + '/public';
  var imageDir = '/media/image';
  var imageFullDir = dataDir + imageDir;
  fs.existsSync(dataDir) || fs.mkdirSync(dataDir);
  fs.existsSync(imageFullDir) || fs.mkdirSync(imageFullDir);
}


