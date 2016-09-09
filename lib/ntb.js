'use strict';

const HttpError = require('@starefossen/http-error');
const fetch = require('node-fetch');

exports.getNtbObject = id => {
  const env = process.env.NTB_API_ENV || 'api';
  const key = process.env.NTB_API_KEY;

  const headers = { Authorization: `Token ${key}` };

  return fetch(`https://${env}.nasjonalturbase.no/steder/${id}`, { headers })
    .then(result => result);
};

exports.middleware = (req, res, next) => {
  const id = req.params.sted;

  exports.getNtbObject(id)
    .then(result => {
      if (result.status !== 200) {
        next(new HttpError(result.statusText, result.status));
      } else {
        req.ntb_steder_object = result.json();
        next();
      }
    });
};
