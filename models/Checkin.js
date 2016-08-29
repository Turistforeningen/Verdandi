'use strict';

const { Schema, Types: { ObjectId: objectId } } = require('../lib/db');
const mongoose = require('../lib/db');

const fetch = require('node-fetch');
const HttpError = require('@starefossen/http-error');

const checkinSchema = new Schema({
  timestamp: Date,
  location: {
    type: { type: String },
    coordinates: [{
      type: Number,
      min: -180,
      max: 180,
    }],
  },
  ntb_steder_id: Schema.Types.ObjectId,
  dnt_user_id: { type: Number, ref: 'User' },
});

checkinSchema.statics.getCheckinsForList = function getCheckinsForList(list) {
  const env = process.env.NTB_API_ENV || 'api';
  const key = process.env.NTB_API_KEY;

  const headers = {
    Authorization: `Token ${key}`,
  };

  return fetch(`https://${env}.nasjonalturbase.no/lister/${list}`, { headers })
    .then(res => {
      if (res.status !== 200) {
        throw new HttpError(`Status Code ${res.status}`, res.status);
      } else {
        return res;
      }
    })
    .then(res => res.json())
    .then(liste => liste.steder || [])
    .then(steder => steder.map(id => objectId(id)))
    .then(steder => this.find().where('ntb_steder_id').in(steder));
};

checkinSchema.index({ location: '2dsphere' });

// Fix for https://github.com/Automattic/mongoose/issues/1251
try {
  module.exports = mongoose.model('Checkin');
} catch (_) {
  module.exports = mongoose.model('Checkin', checkinSchema);
}
