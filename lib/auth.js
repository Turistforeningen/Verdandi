'use strict';

const HttpError = require('@starefossen/http-error');

exports.middleware = (req, res, next) => {
  if (!req.headers['x-user-id']) {
    next(new HttpError('X-User-Id header is required', 401));
  } else {
    req.user = { id: parseInt(req.headers['x-user-id'], 10) };
    next();
  }
};
