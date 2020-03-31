/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
'use strict';

const assert = require('assert');
const request = require('supertest');
const mockery = require('mockery');
const auth = require('../../src/lib/auth');

const users = require('../fixtures/dnt-users');

const getUserData = auth.getUserData;

describe('brukere', () => {
  before(() => {
    auth.getUserData = () => Promise.resolve(users[1]);
  });

  after(() => {
    auth.getUserData = getUserData;
  });

  const brukerId = '1234';
  const url = `/api/dev/brukere/${brukerId}`;


  describe('User stats and log', () => {
    let appMocked;

    before(() => mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false,
    }));

    before(() => {
      appMocked = request(require('../../src/index'));
    });

    after(() => mockery.disable());

    describe('GET /brukere/:bruker/stats', () => {
      it('returns stats for a user', () => (
        appMocked.get(`${url}/stats`)
          .set('X-Client-Token', 'client123')
          .expect(200)
          .expect(res => {
            assert.equal(res.body.lister.length, 2);
            assert.equal(res.body.innsjekkinger.count, 3);
            assert.equal(res.body.innsjekkinger.private, 2);
            assert.equal(res.body.innsjekkinger.public, 1);
          })
      ));
    });

    describe('POST /brukere/:bruker/bytt-id', () => {
      const oldUserId = 1234;
      const newUserId = 9999;

      it('returns stats for a user', () => (
        appMocked.post(`${url}/bytt-id`)
          .set('X-Client-Token', 'client123')
          .send({ _id: newUserId })
          .then(res => {
            assert.equal(res.body._id, newUserId);

            // Then request old user
            return appMocked.get(`${url}/stats`).set('X-Client-Token', 'client123');
          })
          .then(res => {
            // Old user does not exist any more
            assert.equal(res.status, 404);
          })
          .then(() => (
            // Request new user stats
            appMocked.get(`${url.replace(oldUserId, newUserId)}/stats`).set('X-Client-Token', 'client123')
          ))
          .then(res => {
            // New user stats are received
            assert.equal(res.body.innsjekkinger.count, 3);
            assert.equal(res.body.bruker, newUserId);
          })
      ));
    });

    describe('GET /brukere/:bruker/logg', () => {
      it('returns a complete log for a user when valid client', () => (
        appMocked.get(`${url}/logg`)
          .set('X-Client-Token', 'client123')
          .expect(200)
          .expect(res => {
            assert.equal(res.body.steder.length, 3);
            assert.equal(res.body.logg.length, 3);
          })
      ));

      it('returns only public log for a user when anonymous client', () => (
        appMocked.get(`${url}/logg`)
          .expect(200)
          .expect(res => {
            assert.equal(res.body.steder.length, 1);
            assert.equal(res.body.logg.length, 1);
          })
      ));
    });
  });
});
