'use strict';

const mongo = require('../lib/db');

const User = require('../models/User');
const Checkin = require('../models/Checkin');
const Photo = require('../models/Photo');

const users = require('./fixtures/users');
const checkins = require('./fixtures/checkins');
const photos = require('./fixtures/photos');

process.env.CHECKIN_MAX_DISTANCE = 200;
process.env.CHECKIN_TIMEOUT = 86400;
process.env.AWS_BUCKET_PATH = 'test/';

// mongodb connect
before(function before(done) {
  this.timeout(10000);

  if (mongo.connection._hasOpened) {
    process.nextTick(done);
  } else {
    mongo.connection.once('open', done);
  }
});

after(() => {
  mongo.models = {};
  mongo.modelSchemas = {};
});

// mongodb clean
beforeEach(() => mongo.connection.db.dropDatabase());

// mongodb insert
beforeEach(() => Promise.all([
  User.collection.collection.insert(users),
  Checkin.collection.collection.insert(checkins),
  Photo.collection.collection.insert(photos),
]));
