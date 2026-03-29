const { translateErrorMessage } = require('../utils/errorMessages');

const adminOnly = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ success: false, message: translateErrorMessage('Admin access required') });
  }
  next();
};

module.exports = adminOnly;
