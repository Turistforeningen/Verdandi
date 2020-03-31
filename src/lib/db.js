'use strict';

const mongoose = require('mongoose');
const secrets = require('./secrets');

// Use native promises
mongoose.Promise = global.Promise;

if (mongoose.connection._hasOpened) {
  module.exports = mongoose;
} else {
  let mongoUri = process.env.MONGO_URI || secrets.MONGO_URI;

  module.exports = mongoose.connect(mongoUri);
  module.exports.connection.on('error', err => {
    throw err;
  });
}
