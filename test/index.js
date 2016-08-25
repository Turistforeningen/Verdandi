'use strict';

const mongo = require('../lib/db');

const User = require('../models/User');
const Checkin = require('../models/Checkin');

const users = require('./fixtures/users');
const checkins = require('./fixtures/checkins');

// mongodb connect
before(function before(done) {
  this.timeout(10000);

  if (mongo.connection._hasOpened) {
    process.nextTick(done);
  } else {
    mongo.connection.once('open', done);
  }
});

// mongodb clean
beforeEach(() => mongo.connection.db.dropDatabase());

// mongodb insert
beforeEach(() => Promise.all([
  User.collection.collection.insert(users),
  Checkin.collection.collection.insert(checkins),
]));
