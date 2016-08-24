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
  // TODO: Consider if `x-user-id` is necessary
  if (!req.headers['x-user-id']) {
    next(new HttpError('X-User-Id header is required', 401));
  } else if (!req.headers['x-user-token']) {
    next(new HttpError('X-User-Token header is required', 401));
  } else {
    exports.getUserData(req.headers['x-user-token'])
      .then(user => {
        req.user = user;
        req.user.id = user.sherpa_id;
        next();
      })
      .catch(err => next(new HttpError('User authentication failed', 403, err)));
  }
};
