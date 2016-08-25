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

// Fix for https://github.com/Automattic/mongoose/issues/1251
try {
  module.exports = mongoose.model('User');
} catch (_) {
  module.exports = mongoose.model('User', userSchema);
}
