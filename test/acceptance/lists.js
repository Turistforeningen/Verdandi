/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
'use strict';

const assert = require('assert');
const request = require('supertest');
const app = request(require('../../index'));
const auth = require('../../lib/auth');

const users = require('../fixtures/dnt-users');

const getUserData = auth.getUserData;

describe.only('POST /lister/:liste/blimed', () => {
  before(() => {
    auth.getUserData = () => Promise.resolve(users[1]);
  });

  after(() => {
    auth.getUserData = getUserData;
  });

  // Append `/blimed` or `/meldav` to join or leave a list
  const url = '/api/dev/lister/57974036b565590001a98884';

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
        assert.notEqual(res.body.data.lister.indexOf('57974036b565590001a98884'), -1);
        done();
      });
  });

  it('removes the list from the users lists array', done => {
    app.post(`${url}/meldav`)
      .set('X-User-Id', '1234')
      .set('X-User-Token', 'abc123')
      .expect(200)
      .end((req, res) => {
        assert.equal(res.body.message, 'Ok');
        assert.equal(res.body.data.lister.indexOf('57974036b565590001a98884'), -1);
        done();
      });
  });
});
