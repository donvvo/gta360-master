var mongoose = require('mongoose');

var adminSettingsSchema = mongoose.Schema({
  videoPackagesPricing: {
    smallPricing: String,
    mediumPricing: String,
    largePricing: String
  },
  photoPackagesPricing: {
    smallPricing: String,
    mediumPricing: String,
    largePricing: String
  },
  additionalServices: [
    {
      service: String,
      icon: String
    }
  ]
});

var AdminSettings = mongoose.model('AdminSettings', adminSettingsSchema);

module.exports = AdminSettings;
