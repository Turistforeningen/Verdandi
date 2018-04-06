'use strict';

const mongoose = require('mongoose');
const secrets = require('./secrets');

// Use native promises
mongoose.Promise = global.Promise;

if (mongoose.connection._hasOpened) {
  module.exports = mongoose;
} else {
  let mongoUri = process.env.MONGO_URI || secrets.MONGO_URI;

  if (typeof mongoUri === 'undefined' || !mongoUri) {
    if (!process.env.MONGO_DB) {
      throw new Error('Environment variable "MONGO_DB" is undefined');
    }

    const addr = process.env.MONGO_PORT_27017_TCP_ADDR || 'mongo';
    const port = process.env.MONGO_PORT_27017_TCP_PORT || 27017;
    const db = process.env.MONGO_DB;

    mongoUri = `mongodb://${addr}:${port}/${db}`;
  }

  module.exports = mongoose.connect(mongoUri);
  module.exports.connection.on('error', err => {
    throw err;
  });
}
