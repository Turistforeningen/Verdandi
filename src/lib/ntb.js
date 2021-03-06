'use strict';

const HttpError = require('@starefossen/http-error');
const fetch = require('node-fetch');
const secrets = require('./secrets');

exports.getNtbObject = (endpoint, id) => {
  const key = secrets.NTB_API_KEY;
  const headers = { Authorization: `Token ${key}` };

  return fetch(`${process.env.NTB_API_URL}/${endpoint}/${id}`, { headers })
    .then(result => result);
};

exports.middleware = (req, res, next) => {
  let type;
  let endpoint;

  if (typeof req.params.liste !== 'undefined') {
    type = 'liste';
    endpoint = 'lister';
  } else if (typeof req.params.sted !== 'undefined') {
    type = 'sted';
    endpoint = 'steder';
  }

  const id = req.params[type];

  exports.getNtbObject(endpoint, id)
    .then(result => {
      if (result.status !== 200) {
        throw new HttpError(result.statusText, result.status);
      } else {
        return result.json();
      }
    })
    .then(json => {
      req.ntbObject = json;
      return next();
    })
    .catch(err => next(err));
};
