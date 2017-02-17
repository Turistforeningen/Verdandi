/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
'use strict';

const request = require('supertest');
const app = request(require('../../index'));

const users = require('../fixtures/users.js');
const checkins = require('../fixtures/checkins.js');

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

  it('returns user profile for existing user', done => {
    const user = JSON.parse(JSON.stringify(users[0]));

    user.innsjekkinger = [
      JSON.parse(JSON.stringify(checkins[0])),
      JSON.parse(JSON.stringify(checkins[1])),
    ];

    app.get(`${url}/1234`)
      .set('X-User-Id', '1234')
      .set('X-User-Token', 'abc123')
      .expect(200)
      .expect({ data: user }, done);
  });

  it('hides private checkins for unauthenticated request', done => {
    const user = JSON.parse(JSON.stringify(users[0]));

    user.innsjekkinger = [
      JSON.parse(JSON.stringify(checkins[1])),
    ];

    app.get(`${url}/1234`)
      .expect(200)
      .expect({ data: user }, done);
  });
});
