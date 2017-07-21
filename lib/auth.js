'use strict';

const HttpError = require('@starefossen/http-error');
const fetch = require('node-fetch');
const md5 = require('md5');
const User = require('../models/User');
const secrets = require('./secrets');
const redis = require('./redis');

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

exports.saveUserData = data => {
  const { sherpa_id: _id, fornavn, etternavn, epost } = data;

  return User.findOne({ _id })
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
    });
};

exports.clientVerify = token => (
  new Promise((resolve, reject) => {
    const clientTokens = secrets.API_CLIENT_TOKENS.split(',');

    if (clientTokens.includes(token)) {
      resolve({});
    }

    reject('Invalid client token');
  })
);

exports.userVerify = (id, token) => (
  redis.get(`user:${id}:${token}`)
    .then(data => {
      if (data === null) {
        return exports.getUserData(token)
          .then(user => {
            if (user.sherpa_id !== id) {
              return Promise.reject(`Invalid token for user ${id}`);
            }
            return user;
          })
          .then(exports.saveUserData)
          .then(user => (
            redis.set(`user:${id}:${token}`, JSON.stringify(user))
              .then(() => redis.expire(`user:${id}:${token}`, 86400).then(() => user))
              .catch(reason => {
                throw new Error('Could not save user');
              })
          ))
          .catch(err => {
            if (err.code === 403) {
              return Promise.reject(`Invalid token for user ${id}`);
            }
            return Promise.reject('Could not authenticate');
          });
      }

      return JSON.parse(data);
    })
);

exports.middleware = (req, res, next) => {
  if (req.authClient && req.authClient.isAuthenticated) {
    // Request is already authenticated as client
    return next();
  } else if (req.authUser && req.authUser.isAuthenticated) {
    // Request is already authenticated as user
    return next();
  } else if (req.headers['x-client-token']) {
    // Authenticate as client
    return exports.clientVerify(req.headers['x-client-token'])
      .then(client => {
        req.authClient = Object.assign(client, { isAuthenticated: true });
        next();
      })
      .catch(reason => next(new HttpError(reason, 401)));
  } else if (req.headers['x-user-id'] || req.headers['x-user-token']) {
    // Check that both headers required for user auth are present
    if (!req.headers['x-user-id']) {
      return next(new HttpError('X-User-Id header is required for user auth', 401));
    } else if (!req.headers['x-user-token']) {
      return next(new HttpError('X-User-Token header is required for user auth', 401));
    }
    // Authenticate as user
    return exports.userVerify(Number(req.headers['x-user-id']), req.headers['x-user-token'])
      .then(user => User.findOne({ _id: user._id }))
      .then(user => {
        req.authUser = user;
        req.authUser.isAuthenticated = true;

        next();
      })
      .catch(reason => { next(new HttpError(reason, 401)); });
  }

  delete req.authClient;
  delete req.authUser;

  return next();
};

exports.requireAuth = (req, res, next) => {
  if (req.authUser && req.authUser.isAuthenticated) {
    return next();
  } else if (req.authClient && req.authClient.isAuthenticated) {
    return next();
  }

  return next(new HttpError('Unauthorized', 401));
};

exports.requireClient = (req, res, next) => {
  if (req.authClient && req.authClient.isAuthenticated === true) {
    return next();
  }
  return next(new HttpError('X-Client-Id header is required', 401));
};

exports.requireUser = (req, res, next) => {
  if (req.authUser && req.authUser.isAuthenticated === true) {
    return next();
  }
  return next(new HttpError('X-User-Id header is required', 401));
};

exports.isClient = req => !!(req.authClient && req.authClient.isAuthenticated === true);

exports.isUser = req => !!(req.authUser && req.authUser.isAuthenticated === true);
