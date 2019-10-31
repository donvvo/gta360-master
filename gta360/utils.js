var Tour = require('./models/tours.js')

module.exports = {
  authenticatedUserOnly: function(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/signin');
  },
  getTourQueryFilterByUserType: function(req) {
    if (req.user.user_type === 'CLIENT') {
      return { 'creator': req.user._id }
    }
    else if (req.user.user_type === 'MANAGER') {
      return { 'manager': req.user._id }
    }
    else {
      return {}
    }
  },
  raise401Error: function(message) {
    var error = new Error(message)
    error.status = 401

    return error
  }
}
