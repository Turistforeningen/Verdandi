'use strict';

const mongoose = require('../lib/db');

const Schema = mongoose.Schema;

const checkinSchema = new Schema({
  timestamp: Date,
  location: {
    type: String,
    coordinates: [],
  },
  ntb_steder_id: Schema.Types.ObjectId,
  dnt_user_id: { type: Number, ref: 'User' },
});

checkinSchema.index({location: '2dsphere'});

module.exports = mongoose.model('Checkin', checkinSchema);
