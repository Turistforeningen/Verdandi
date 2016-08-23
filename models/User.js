'use strict';

const mongoose = require('../lib/db');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  _id: Number,
  navn: String,
  epost: String,
  lister: [],
  innsjekkinger: [{ type: Schema.Types.ObjectId, ref: 'Checkin' }],
});

module.exports = mongoose.model('User', userSchema);
