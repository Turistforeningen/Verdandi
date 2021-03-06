'use strict';

const { Schema } = require('../lib/db');
const mongoose = require('../lib/db');
const secrets = require('../lib/secrets');
const { isClient, isUser } = require('../lib/auth');

const fetch = require('node-fetch');
const geoutil = require('geoutil');

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

  user: {
    type: Number,
    ref: 'User',
  },

  comment: {
    type: String,
    default: null,
  },

  photo: {
    type: Schema.Types.ObjectId,
    ref: 'Photo',
    default: null,
  },
}, { usePushEach: true });

checkinSchema.pre('save', function preSave(next) {
  this.user = this.dnt_user_id;
  next();
});

checkinSchema.methods.anonymize = function anonymize(user, validAPIClient) {
  const userId = isNaN(Number(user)) ? undefined : Number(user);

  if (userId === this.dnt_user_id || validAPIClient) {
    return this;
  } else if (this.public === true) {
    this.set('user', {
      _id: this.user._id,
      navn: this.user.navn,
      avatar: this.user.avatar || null,
    });
  } else {
    this.set('user', null);
    this.set('dnt_user_id', null);
    this.set('location', null);
    this.set('photo', null);
    this.set('comment', null);
  }

  return this;
};

checkinSchema.path('timestamp').validate({
  isAsync: false,
  validator: function validateTimestamp(value) { // eslint-disable-line prefer-arrow-callback
    return new Date(value) < new Date();
  },
  message: `Checkins from the future (timestamp greater than ${new Date().toISOString()}) not allowed`, // eslint-disable-line max-length
});

checkinSchema.path('location.coordinates').validate({
  isAsync: true,
  validator: function validateCoordinates(value, cb) { // eslint-disable-line prefer-arrow-callback
    const env = process.env.NTB_API_ENV || 'api';
    const key = secrets.NTB_API_KEY;

    const headers = { Authorization: `Token ${key}` };

    fetch(`https://${env}.nasjonalturbase.no/steder/${this.ntb_steder_id}`, { headers })
      .then(res => { // eslint-disable-line consistent-return
        if (res.status !== 200) {
          // throw new HttpError(`Status Code ${res.status}`, res.status);
          cb(false);
        } else {
          return res;
        }
      })
      .then(res => res.json())
      .then(sted => {
        const distance = geoutil.pointDistance(value, sted.geojson.coordinates, true);
        cb(distance <= parseInt(process.env.CHECKIN_MAX_DISTANCE, 10));
      });
  },
  message: `Checkin only within ${process.env.CHECKIN_MAX_DISTANCE} m. radius`,
});

checkinSchema.path('timestamp').validate({
  isAsync: true,
  validator: function validateTimestamp(value, cb) { // eslint-disable-line prefer-arrow-callback
    const Checkin = mongoose.model('Checkin', checkinSchema);
    const checkinQuarantine = new Date(value);
    checkinQuarantine.setSeconds(
      checkinQuarantine.getSeconds() - parseInt(process.env.CHECKIN_TIMEOUT, 10)
    );

    Checkin.find()
      .where('dnt_user_id')
      .equals(this.dnt_user_id)
      .where('ntb_steder_id')
      .equals(this.ntb_steder_id)
      .where('timestamp')
      .gt(checkinQuarantine)
      .exec((err, result) => {
        cb(!result.length);
      });
  },
  message: `Checking in to same place twice within ${process.env.CHECKIN_TIMEOUT} seconds is not allowed`,
});

checkinSchema.methods.isReadAllowed = function isReadAllowed(req) {
  if (this.public === true) {
    return true;
  } else if (isClient(req)) {
    return true;
  } else if (isUser(req)) {
    return this.user._id === Number(req.headers['x-user-id']);
  }

  return false;
};

checkinSchema.methods.isWriteAllowed = function isWriteAllowed(req) {
  if (isClient(req)) {
    return true;
  } else if (isUser(req)) {
    return this.isOwner(req);
  }

  return false;
};

checkinSchema.methods.isOwner = function isOwner(req) {
  const reqUserId = Number(req.headers['x-user-id']);

  if (typeof this.user === 'number') {
    return this.user === reqUserId;
  } else if (this.user && typeof this.user._id === 'number') {
    return this.user._id === reqUserId;
  }

  return false;
};

checkinSchema.index({ location: '2dsphere' });

// Fix for https://github.com/Automattic/mongoose/issues/1251
try {
  module.exports = mongoose.model('Checkin');
} catch (_) {
  module.exports = mongoose.model('Checkin', checkinSchema);
}
