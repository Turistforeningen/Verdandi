'use strict';

const mongoose = require('../lib/db');

const Schema = mongoose.Schema;

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

checkinSchema.index({ location: '2dsphere' });

// Fix for https://github.com/Automattic/mongoose/issues/1251
try {
  module.exports = mongoose.model('Checkin');
} catch (_) {
  module.exports = mongoose.model('Checkin', checkinSchema);
}
