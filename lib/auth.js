'use strict';

const HttpError = require('@starefossen/http-error');
const fetch = require('node-fetch');
const User = require('../models/User');

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

// NOTE: Rename to either setUserData or createOrUpdateUserData?
exports.setOrUpdateUserData = (userId, { sherpa_id: _id, fornavn, etternavn, epost }) => (
  User.findOne({ _id: userId })
    // Get existing or create new user
    .then(user => {
      if (user) { return user; }
      return new User({ _id });
    })
    // Update user
    .then(user => {
      user.navn = `${fornavn} ${etternavn}`;
      user.epost = epost;
      return user.save();
    })
);

exports.middleware = (req, res, next) => {
  // TODO: Consider if `x-user-id` is necessary
  if (!req.headers['x-user-id']) {
    next(new HttpError('X-User-Id header is required', 401));
  } else if (!req.headers['x-user-token']) {
    next(new HttpError('X-User-Token header is required', 401));
  } else {
    exports.getUserData(req.headers['x-user-token'])
      .then(userData => {
        // Create or update user after fetching user data
        exports.setOrUpdateUserData(userData.sherpa_id, userData);
      })
      .then(user => {
        req.user = user;
        req.user.id = user.sherpa_id;
        next();
      })
      .catch(err => next(new HttpError('User authentication failed', 403, err)));
  }
};
