/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
'use strict';

const assert = require('assert');
const request = require('supertest');
const app = request(require('../../index'));
const mockery = require('mockery');

const auth = require('../../lib/auth');

const getUserData = auth.getUserData;

describe('GET /', () => {
  let appMocked;
  let authMocked;

  before(() => mockery.enable({
    useCleanCache: true,
    warnOnReplace: false,
    warnOnUnregistered: false,
  }));

  before(() => {
    appMocked = request(require('../../index')); // eslint-disable-line global-require
  });

  before(() => {
    authMocked = require('../../lib/auth'); // eslint-disable-line global-require

    authMocked.getUserData = () => Promise.resolve({
      sherpa_id: 9876,
      fornavn: 'Tor',
      etternavn: 'Torsen',
      epost: 'tor.torsen@example.com',
    });
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
