'use strict';

module.exports = (req, res, next) => {
  const path = process.env.VIRTUAL_PATH || '';

  req.fullUrl = `${req.protocol}://${req.get('host')}${path}`;
  next();
};
