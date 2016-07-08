'use strict';

const r = require('../lib/rethink');

before(done => r.on('open', done));

['checkins', 'profiles'].forEach(type => {
  const data = require(`./support/data/${type}`); // eslint-disable-line global-require

  beforeEach(done => r.r.tableCreate(type).run(r.c, done));
  beforeEach(done => r.r.table(type).insert(data).run(r.c, done));
  afterEach(done => r.r.tableDrop(type).run(r.c, done));
});
