const { translateErrorMessage, getErrorStatus } = require('../utils/errorMessages');

const errorHandler = (err, req, res, next) => {
  console.error(err.stack || err);

  const status = getErrorStatus(err, 500);
  const message = translateErrorMessage(err, 'Внутренняя ошибка сервера');

  res.status(status).json({ success: false, message });
};

module.exports = errorHandler;
