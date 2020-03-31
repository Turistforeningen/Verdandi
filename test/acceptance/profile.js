/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
'use strict';

const request = require('supertest');
const mockery = require('mockery');

const app = request(require('../../src/index'));
const auth = require('../../src/lib/auth');

const users = require('../fixtures/users.js');
const dntUsers = require('../fixtures/dnt-users.js');
const checkins = require('../fixtures/checkins.js');

const getUserData = auth.getUserData;

describe('GET /brukere/:bruker', () => {
  const url = '/api/dev/brukere';

  it('returns error for invalid user ID', done => {
    app.get(`${url}/invalid`)
      .expect(400)
      .expect({
        code: 400,
        message: 'Invalid user id "invalid"',
      }, done);
  });

  it('returns error for unknown user ID', done => {
    app.get(`${url}/404`)
      .expect(404)
      .expect({
        code: 404,
        message: 'User "404" Not Found',
      }, done);
  });

  describe('new user', () => {
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

    it('creates a new user if not existing and valid auth', done => {
      appMocked.get(`${url}/9876`)
        .set('X-User-Id', '9876')
        .set('X-User-Token', 'xyz123')
        .expect(200, done);
    });
  });

  describe('existing user', () => {
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

      authMocked.getUserData = () => Promise.resolve(dntUsers[1]);
    });

    after(() => {
      authMocked.getUserData = getUserData;
    });

    after(() => mockery.disable());

    it('returns user profile for existing user', done => {
      const user = JSON.parse(JSON.stringify(users[0]));
      user.innsjekkinger = JSON.parse(JSON.stringify([checkins[0], checkins[1]]));

      appMocked.get(`${url}/1234`)
        .set('X-User-Id', '1234')
        .set('X-User-Token', 'abc123')
        .expect(200)
        .expect({ data: user }, done);
    });

    it('hides private checkins for unauthenticated request', done => {
      const user = JSON.parse(JSON.stringify(users[0]));
      user.innsjekkinger = JSON.parse(JSON.stringify([checkins[1]]));

      appMocked.get(`${url}/1234`)
        .expect(200)
        .expect({ data: user }, done);
    });
  });
});
