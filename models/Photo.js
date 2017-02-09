'use strict';

const { Schema } = require('../lib/db');
const mongoose = require('../lib/db');

const photoSchema = new Schema({
  versions: {
    type: Array,
    default: [],
  },
});

// Fix for https://github.com/Automattic/mongoose/issues/1251
try {
  module.exports = mongoose.model('Photo');
} catch (_) {
  module.exports = mongoose.model('Photo', photoSchema);
}
