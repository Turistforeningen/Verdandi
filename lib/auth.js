'use strict';

const HttpError = require('@starefossen/http-error');
const fetch = require('node-fetch');
const md5 = require('md5');
const User = require('../models/User');
const secrets = require('./secrets');

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
exports.setOrUpdateUserData = ({ sherpa_id: _id, fornavn, etternavn, epost }) => (
  User.findOne({ _id })
    // Create new user if one does not exist
    .then(user => user || new User({ _id }))

    // Update user with OAuth data
    .then(user => {
      user.navn = `${fornavn} ${etternavn}`;

      if (typeof epost === 'string') {
        user.epost = epost;
        user.avatar = `https://www.gravatar.com/avatar/${md5(epost)}`;
      }

      return user.save();
    })
);

exports.auth = (req, res, next) => {
  // Skip if user is already set
  if (req.user && req.user.id) {
    next();
  } else {
    exports.getUserData(req.headers['x-user-token'])
      // Create or update user after fetching user data
      .then(exports.setOrUpdateUserData)

      // Attach `user` to session request `req`
      .then(user => {
        req.user = user;
        req.user.id = user.sherpa_id;
        next();
      })

      .catch(err => next(new HttpError('User authentication failed', 403, err)));
  }
};

exports.optionalAuth = (req, res, next) => {
  // TODO(Håvard): Throw err on any request if one auth header is passed
  // without not the other
  if (!req.headers['x-user-id'] || !req.headers['x-user-token']) {
    next();
  } else if (!req.headers['x-user-id']) {
    next(new HttpError('X-User-Id header is required', 401));
  } else if (!req.headers['x-user-token']) {
    next(new HttpError('X-User-Token header is required', 401));
  } else {
    exports.auth(req, res, next);
  }
};

exports.requireAuth = (req, res, next) => {
  const clientTokens = secrets.API_CLIENT_TOKENS.split(',');

  if (req.headers['x-client-token']) {
    if (clientTokens.includes(req.headers['x-client-token'])) {
      req.validAPIClient = true;
      next();
    } else {
      next(new HttpError('X-Client-Token is invalid', 403));
    }
  } else if (!req.headers['x-user-id']) {
    next(new HttpError('X-User-Id header is required', 401));
  } else if (!req.headers['x-user-token']) {
    next(new HttpError('X-User-Token header is required', 401));
  } else {
    exports.auth(req, res, next);
  }
};

exports.optionalClientAuth = (req, res, next) => {
  const clientTokens = secrets.API_CLIENT_TOKENS.split(',');

  if (!req.headers['x-client-token']) {
    req.validAPIClient = false;
    next();
  } else if (!clientTokens.includes(req.headers['x-client-token'])) {
    next(new HttpError('X-Client-Token is invalid', 403));
  } else {
    req.validAPIClient = true;
    next();
  }
};

exports.requireClientAuth = (req, res, next) => {
  const clientTokens = secrets.API_CLIENT_TOKENS.split(',');
  if (!req.headers['x-client-token']) {
    next(new HttpError('X-Client-Token header is required', 401));
  } else if (!clientTokens.includes(req.headers['x-client-token'])) {
    next(new HttpError('X-Client-Token is invalid', 403));
  } else {
    req.validAPIClient = true;
    next();
  }
};
