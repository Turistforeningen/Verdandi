'use strict';
/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */

const request = require('supertest');
const app = request(require('../../index'));

const profiles = require('../support/data/profiles.js');

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

  it('reutrns error for unknown user ID', done => {
    app.get(`${url}/404`)
      .expect(404)
      .expect({
        code: 404,
        message: 'User "404" Not Found',
      }, done);
  });

  it('returns user profile for existing user', done => {
    app.get(`${url}/1234`)
      .expect(200)
      .expect({ data: profiles[0] }, done);
  });
});
