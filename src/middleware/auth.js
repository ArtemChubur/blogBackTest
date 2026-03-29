const jwt = require('jsonwebtoken');
require('dotenv').config();
const { translateErrorMessage } = require('../utils/errorMessages');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: translateErrorMessage('Access token required') });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ success: false, message: translateErrorMessage(err) });
    req.user = user;
    next();
  });
};

const optionalAuthenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ success: false, message: translateErrorMessage(err) });
    req.user = user;
    next();
  });
};

const authenticateRefreshToken = (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ success: false, message: translateErrorMessage('Refresh token required') });

  jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, user) => {
    if (err) return res.status(401).json({ success: false, message: translateErrorMessage('Invalid or expired refresh token') });
    req.user = user;
    next();
  });
};

module.exports = { authenticateToken, authenticateRefreshToken, optionalAuthenticateToken };
