/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
'use strict';

const assert = require('assert');
const request = require('supertest');
const mockery = require('mockery');
const app = request(require('../../src/index'));
const auth = require('../../src/lib/auth');

const users = require('../fixtures/dnt-users');

const getUserData = auth.getUserData;

describe('lister', () => {
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

    it('should only join a list once', done => {
      app.post(`${url}/blimed`)
        .set('X-User-Id', '1234')
        .set('X-User-Token', 'abc123')
        .expect(200)
        .end(() => {
          app.post(`${url}/blimed`)
            .set('X-User-Id', '1234')
            .set('X-User-Token', 'abc123')
            .expect(200)
            .end((req, res) => {
              assert.equal(res.body.message, 'Ok');
              assert.equal(
                res.body.data.lister.indexOf(listId),
                res.body.data.lister.lastIndexOf(listId)
              );
              done();
            });
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

  describe('Lists stats and users', () => {
    let appMocked;
    let authMocked;

    before(() => mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false,
    }));

    before(() => mockery.registerMock('node-fetch', () => Promise.resolve({
      status: 200,
      json: () => ({
        steder: ['400000000000000000000001'],
      }),
    })));

    before(() => {
      appMocked = request(require('../../src/index'));
    });

    before(() => {
      authMocked = require('../../src/lib/auth');

      authMocked.getUserData = () => Promise.resolve(users[1]);
    });

    after(() => {
      authMocked.getUserData = getUserData;
    });

    after(() => mockery.deregisterMock('node-fetch'));
    after(() => mockery.disable());

    describe('GET /lister/:liste/stats', () => {
      it('returns stats for a list', () => (
        appMocked.get(`${url}/stats`)
          .expect(200)
          .expect(res => {
            const stedId = '400000000000000000000001';
            assert.equal(res.body.innsjekkinger.count, 3);
            assert.equal(res.body.innsjekkinger.steder[stedId], 3);
            assert.equal(res.body.innsjekkinger.private, 1);
            assert.equal(res.body.innsjekkinger.public, 2);
            assert.equal(res.body.signedUp, 0);
          })
      ));
    });

    describe('GET /lister/:liste/brukere', () => {
      it('returns users that have checked in to a place in the list', () => (
        appMocked.get(`${url}/brukere`)
          .set('X-Client-Token', 'client123')
          .expect(200)
          .expect(res => {
            assert.equal(res.body.brukere.length, 2);
            assert.ok(res.body.brukere.find(user => user._id === 1234));
            assert.ok(res.body.brukere.find(user => user._id === 5678));
            assert.equal(
              res.body.brukere.find(user => user._id === 5678).innsjekkinger.logg.length,
              2
            );
          })
      ));
    });
  });

  describe('GET /lister/:liste/logg', () => {
    let appMocked;
    let authMocked;

    before(() => mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false,
    }));

    before(() => mockery.registerMock('node-fetch', () => Promise.resolve({
      status: 200,
      json: () => ({
        steder: ['400000000000000000000001'],
      }),
    })));

    before(() => {
      appMocked = request(require('../../src/index'));
    });

    before(() => {
      authMocked = require('../../src/lib/auth');

      authMocked.getUserData = () => Promise.resolve(users[1]);
    });

    after(() => {
      authMocked.getUserData = getUserData;
    });

    after(() => mockery.deregisterMock('node-fetch'));
    after(() => mockery.disable());

    it('returns a log of checkins to a place in a list', () => (
      appMocked.get(`${url}/logg`)
        .set('X-User-Id', '1234')
        .set('X-User-Token', 'abc123')
        .expect(200)
        .expect(res => {
          assert.equal(res.body.data.length, 3);
        })
    ));

    it('respects query param public', () => (
      appMocked.get(`${url}/logg?public=true`)
        .expect(200)
        .expect(res => {
          const { data } = res.body;
          data.forEach(checkin => assert.equal(checkin.public, true));
        })
    ));


    it('removes user data if checkin is not public', () => (
      appMocked.get(`${url}/logg`)
        .expect(200)
        .expect(res => {
          const data = res.body.data;

          assert.equal(data.length, 3);

          data.forEach(checkin => {
            if (checkin.public === true) {
              assert.equal(typeof checkin.user.navn, 'string');
              assert.equal(typeof checkin.location, 'object');
              assert.equal(typeof checkin.dnt_user_id, 'number');
            } else {
              assert.equal(checkin.user, null);
              assert.equal(checkin.location, null);
              assert.equal(checkin.dnt_user_id, null);
            }
          });
        })
    ));
  });
});
