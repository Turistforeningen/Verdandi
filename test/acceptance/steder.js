/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
'use strict';

const assert = require('assert');
const request = require('supertest');
const mockery = require('mockery');
const auth = require('../../lib/auth');

const users = require('../fixtures/dnt-users');

const getUserData = auth.getUserData;

describe('steder', () => {
  before(() => {
    auth.getUserData = () => Promise.resolve(users[1]);
  });

  after(() => {
    auth.getUserData = getUserData;
  });

  const stedId = '400000000000000000000001';
  const url = `/api/dev/steder/${stedId}`;


  describe('Steders stats and users', () => {
    let appMocked;

    before(() => mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false,
    }));

    before(() => mockery.registerMock('node-fetch', () => Promise.resolve({
      status: 200,
      json: () => ({ _id: stedId }),
    })));

    before(() => {
      appMocked = request(require('../../index')); // eslint-disable-line global-require
    });

    after(() => mockery.disable());

    describe('GET /steder/:sted/brukere', () => {
      it('returns users that have checked in to a place', () => (
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
});
