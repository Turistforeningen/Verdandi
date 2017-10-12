'use strict';

const mongoose = require('../lib/db');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  _id: Number,
  navn: String,
  epost: String,
  avatar: String,
  fodselsdato: Date,
  lister: [],
  innsjekkinger: [{ type: Schema.Types.ObjectId, ref: 'Checkin' }],
});

userSchema.methods.filterCheckins = function filterCheckins(userId) {
  if (userId !== this._id) {
    this.innsjekkinger = this.innsjekkinger.filter(i => !!i.public);
  }

  return this;
};

// Fix for https://github.com/Automattic/mongoose/issues/1251
try {
  module.exports = mongoose.model('User');
} catch (_) {
  module.exports = mongoose.model('User', userSchema);
}
