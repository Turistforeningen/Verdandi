/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
'use strict';

const assert = require('assert');
const request = require('supertest');
const app = request(require('../../src/index'));
const mockery = require('mockery');

const auth = require('../../src/lib/auth');

const getUserData = auth.getUserData;
const dntUsers = require('../fixtures/dnt-users');

describe('GET /', () => {
  let appMocked;
  let authMocked;

  before(() => mockery.enable({
    useCleanCache: true,
    warnOnReplace: false,
    warnOnUnregistered: false,
  }));

  before(() => {
    appMocked = request(require('../../src/index'));
  });

  before(() => {
    authMocked = require('../../src/lib/auth');

    authMocked.getUserData = () => (
      Promise.resolve(dntUsers.find(u => u.sherpa_id === 1234))
    );
  });

  after(() => {
    authMocked.getUserData = getUserData;
  });

  after(() => mockery.disable());

  const url = '/api/dev/';

  it('returns API index', () => (
    app.get(url)
      .expect(200)
      .expect(res => {
        assert.equal(typeof res.body.checkin_new.rules, 'object');
        assert.equal(typeof res.body.checkin_new.rules.max_distance, 'number');
        assert.equal(typeof res.body.checkin_new.rules.quarantine, 'number');
        Object.keys(res.body).forEach(key => {
          assert.equal(typeof res.body[key].url, 'string');
        });
      })
  ));

  it('returns API index as authenticated', () => (
    appMocked.get(url)
      .set('X-User-Id', '1234')
      .set('X-User-Token', 'abc123')
      .expect(200)
      .expect(res => {
        assert.equal(typeof res.body.checkin_new.rules, 'object');
        assert.equal(typeof res.body.checkin_new.rules.max_distance, 'number');
        assert.equal(typeof res.body.checkin_new.rules.quarantine, 'number');
        Object.keys(res.body).forEach(key => {
          assert.equal(typeof res.body[key].url, 'string');
        });
      })
  ));
});
