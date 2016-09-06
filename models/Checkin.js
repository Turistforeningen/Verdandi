'use strict';

const { Schema, Types: { ObjectId: objectId } } = require('../lib/db');
const mongoose = require('../lib/db');

const fetch = require('node-fetch');
const HttpError = require('@starefossen/http-error');

const checkinSchema = new Schema({
  timestamp: {
    type: Date,
    default: Date.now,
  },

  location: {
    type: {
      type: String,
      enum: ['Point'],
    },
    coordinates: [{
      type: Number,
      min: -180,
      max: 180,
    }],
  },

  public: {
    type: Boolean,
    default: false,
  },

  ntb_steder_id: {
    type: Schema.Types.ObjectId,
    required: true,
  },

  dnt_user_id: {
    type: Number,
    ref: 'User',
    required: true,
  },
});

checkinSchema.methods.anonymize = function anonymize(userId) {
  if (userId !== this._id && !this.public) {
    this.set('dnt_user_id', undefined);
    this.set('location', undefined);
  }

  return this;
};

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
