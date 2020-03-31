'use strict';

const mongo = require('../src/lib/db');

const User = require('../src/models/User');
const Checkin = require('../src/models/Checkin');
const Photo = require('../src/models/Photo');

const users = require('./fixtures/users');
const checkins = require('./fixtures/checkins');
const photos = require('./fixtures/photos');

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
