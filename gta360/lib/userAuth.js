exports.authenticatedUserOnly = function(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/signin');
}

exports.adminOrSelfOnly = function(req, res, next) {
  if (!req.isAuthenticated()) {
    res.redirect('/signin');
  }
  if (req.user.user_type === 'ADMIN' || req.user._id.toString() === req.params.user_id) {
    next()
  }
  else {
    next(new Error('You do not have permission to view this page.'))
  }
}

exports.isAdminOrSelf = function(req) {
  if (!req.isAuthenticated()) {
    return false
  }
  if (req.user.user_type === 'ADMIN' || req.user._id.toString() === req.params.user_id) {
    return true
  }
  
  return false
}

exports.adminOnly = function(req, res, next) {
  if (!req.isAuthenticated()) {
    res.redirect('/signin');
  }
  if (req.user.user_type === 'ADMIN') {
    next()
  }
  else {
    next(new Error('You do not have permission to view this page.'))
  }
}

exports.adminOrManager = function(req, res, next) {
  if (!req.isAuthenticated()) {
    res.redirect('/signin');
  }
  if (req.user.user_type === 'ADMIN' || req.user.user_type === 'MANAGER') {
    next()
  }
  else {
    next(new Error('You do not have permission to view this page.'))
  }
}

exports.isAdmin = function(req) {
  if (!req.isAuthenticated()) {
    return false
  }
  if (req.user.user_type === 'ADMIN') {
    return true
  }
  
  return false
}

exports.isAdminManagerOrSelf = function(req) {
  if (!req.isAuthenticated()) {
    return false
  }
  if (req.user.user_type === 'ADMIN' || req.user._id.toString() === req.params.user_id
  || req.user.user_type === 'MANAGER') {
    return true
  }

  return false
}

exports.isTourAdminAssignedManagerOrSelf = function(req, tour) {
  if (!req.isAuthenticated()) {
    return false
  }
  if (req.user.user_type === 'ADMIN' || req.user._id.toString() === tour.creator.toString()
    || req.user._id.toString() === tour.creator._id.toString()
    || (req.user.user_type === 'MANAGER' && tour.manager && (req.user._id.toString() === tour.manager.toString()))) {
    return true
  }

  return false
}
