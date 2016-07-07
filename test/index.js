'use strict';

const r = require('../lib/rethink');
const checkins = require('./support/data/checkins');

before(done => r.on('open', done));

beforeEach(done => r.r.tableCreate('checkins').run(r.c, done));
beforeEach(done => r.r.table('checkins').insert(checkins).run(r.c, done));
afterEach(done => r.r.tableDrop('checkins').run(r.c, done));
