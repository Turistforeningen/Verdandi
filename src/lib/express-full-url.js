'use strict';

const API_URL_PREFIX = process.env.API_URL_PREFIX || 'v3';

module.exports = (req, res, next) => {
  const path = `/api/${API_URL_PREFIX}`;

  req.fullUrl = `${req.protocol}://${req.get('host')}${path}`;
  next();
};
