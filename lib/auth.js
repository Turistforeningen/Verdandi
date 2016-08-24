'use strict';

const HttpError = require('@starefossen/http-error');
const fetch = require('node-fetch');

exports.getUserData = token => (
  fetch('https://www.dnt.no/api/oauth/medlemsdata/', { headers: {
    Authorization: `Bearer ${token}`,
  } })
    .then(res => {
      if (res.status !== 200) {
        throw new HttpError(`Status Code ${res.status}`, res.status);
      } else {
        return res;
      }
    })
    .then(res => res.json())
);

exports.middleware = (req, res, next) => {
  if (!req.headers['x-user-id']) {
    next(new HttpError('X-User-Id header is required', 401));
  } else {
    req.user = { id: parseInt(req.headers['x-user-id'], 10) };
    next();
  }
};
