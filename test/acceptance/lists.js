/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
'use strict';

const assert = require('assert');
const request = require('supertest');
const mockery = require('mockery');
const app = request(require('../../index'));
const auth = require('../../lib/auth');

const users = require('../fixtures/dnt-users');

const getUserData = auth.getUserData;

describe('POST /lister/:liste/*', () => {
  before(() => {
    auth.getUserData = () => Promise.resolve(users[1]);
  });

  after(() => {
    auth.getUserData = getUserData;
  });

  const listId = '57974036b565590001a98884';
  // Append `/blimed` or `/meldav` to join or leave a list
  const url = `/api/dev/lister/${listId}`;


  describe('POST /lister/:liste/blimed', () => {
    it('returns error for missing user auth', () => (
      app.post(`${url}/blimed`)
        .expect(401)
        .expect({
          code: 401,
          message: 'X-User-Id header is required',
        })
    ));

    it('adds the list id to the users lists array', done => {
      app.post(`${url}/blimed`)
        .set('X-User-Id', '1234')
        .set('X-User-Token', 'abc123')
        .expect(200)
        .end((req, res) => {
          assert.equal(res.body.message, 'Ok');
          assert.notEqual(res.body.data.lister.indexOf(listId), -1);
          done();
        });
    });
  });

  describe('POST /lister/:liste/meldav', () => {
    it('removes the list from the users lists array', done => {
      app.post(`${url}/meldav`)
        .set('X-User-Id', '1234')
        .set('X-User-Token', 'abc123')
        .expect(200)
        .end((req, res) => {
          assert.equal(res.body.message, 'Ok');
          assert.equal(res.body.data.lister.indexOf(listId), -1);
          done();
        });
    });
  });

  describe.only('GET /lister/:liste/logg', () => {
    before(() => mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false,
    }));

    afterEach(() => mockery.deregisterMock('node-fetch'));

    after(() => mockery.disable());

    it('returns a log of checkins to a place in a list', done => {
      // Mock node-fetch
      mockery.registerMock('node-fetch', () => Promise.resolve({
        status: 200,
        json: () => ({
          steder: ['400000000000000000000001'],
        }),
      }));

      // Require new app to apply mocked data
      const appMocked = request(require('../../index')); // eslint-disable-line global-require

      appMocked.get(`${url}/logg`)
        .set('X-User-Id', '1234')
        .set('X-User-Token', 'abc123')
        .expect(200)
        .end((req, res) => {
          assert.equal(res.body.data.checkins.length, 2);
          done();
        });
    });
  });
});
