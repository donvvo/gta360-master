var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');

// User bcrypt for password hashing
var bcrypt = require('bcrypt');
const saltRounds = 5;

var userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Please provide an email.'],
    match: [/[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/, 'Please provide a valid email.'],
    unique: true
  },
  password: {
    type: String,
    required: [true, 'Please provide a password.']
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  name: {
    first_name: String,
    last_name: String
  },
  contact: {
    email: String,
    phone: String
  },
  description: String,
  picture: String,
  user_type: {
    type: String,
    default: "CLIENT",
    enum: ["CLIENT", "MANAGER", "ADMIN"]
  },
  title: String,
  brokerage: String,
  address: String,
  website: String,
  tourNotification: {
    type: Boolean,
    default: true
  }
});
userSchema.plugin(uniqueValidator, { message: 'This {PATH} is already being used. Please provide another email.'});

userSchema.methods.validPassword = function(password, callback) {
  bcrypt.compare(password, this.password, callback);
};
userSchema.methods.changePassword = function(password, callback) {
  var self = this

  bcrypt.hash(password, saltRounds, function (err, hash) {
    if (err) {
      callback(err);
    }

    self.password = hash;

    self.save(function (err, user) {
      callback(err, user);
    });
  });
}
userSchema.statics.signup = function (user, callback) {
  var newUser = new this(user);

  var err = newUser.validateSync();
  if (err) {
    return callback(err);
  }

  newUser.changePassword(newUser.password, callback)
};

userSchema.virtual('name.full').get(function() {
  return this.name.first_name + " " + this.name.last_name;
});

userSchema.virtual('isAdmin').get(function() {
  return (this.user_type === 'ADMIN')
});

userSchema.virtual('isClient').get(function() {
  return (this.user_type === 'CLIENT')
});

userSchema.virtual('notificationEmail').get(function() {
  var email = this.email
  if (this.contact && this.contact.email) {
    email = this.contact.email
  }

  return email
})

userSchema.virtual('user_type_display').get(function() {
  var user_type = this.user_type
  if (user_type === 'MANAGER') {
    user_type = 'PHOTOGRAPHER'
  }

  return user_type
})

userSchema.virtual('contact.phone_link_format').get(function() {
  var phone_number = this.contact.phone
  if (phone_number) {
    phone_number = phone_number.replace(/[\(\)]/g, ' ').replace(/\s+/g, '').replace(/\-/g, '')
  }

  return phone_number
})

var User = mongoose.model('User', userSchema);
module.exports = User;
