/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
'use strict';

const assert = require('assert');
const request = require('supertest');
const mockery = require('mockery');
const app = request(require('../../index'));
const auth = require('../../lib/auth');

const User = require('../../models/User');
const users = require('../fixtures/dnt-users');
const checkins = require('../fixtures/checkins.js');

const getUserData = auth.getUserData;

describe('POST /steder/:sted/besok', () => {
  before(() => mockery.enable({
    useCleanCache: true,
    warnOnReplace: false,
    warnOnUnregistered: false,
  }));

  // Don't have to re-require app after registering mock this time
  before(() => mockery.registerMock('node-fetch', () => Promise.resolve({
    status: 200,
    json: () => ({
      _id: '400000000000000000000000',
      geojson: {
        type: 'Point',
        coordinates: [
          8.31323888888889,
          61.63635277777777,
        ],
      },
    }),
  })));

  after(() => mockery.deregisterMock('node-fetch'));
  after(() => mockery.disable());

  before(() => {
    auth.getUserData = () => Promise.resolve(users[1]);
  });

  after(() => {
    auth.getUserData = getUserData;
  });

  const url = '/api/dev/steder/400000000000000000000000/besok';

  it('returns error for missing user auth', () => (
    app.post(url)
      .send({ lon: -117.220406, lat: 32.719464 })
      .expect(401)
      .expect({
        code: 401,
        message: 'X-User-Id header is required',
      })
  ));

  it('returns error for invalid coordinates', () => (
    app.post(url)
      .set('X-User-Id', '1234')
      .set('X-User-Token', 'abc123')
      .send({ lon: 1337, lat: 4444 })
      .expect(400)
      .expect({
        code: 400,
        message: 'Checkin validation failed',
      })
  ));

  it('stores new checkin to the database', () => (
    app.post(url)
      .set('X-User-Id', '1234')
      .set('X-User-Token', 'abc123')
      .send({
        sted: '400000000000000000000000',
        lon: 8.312466144561768,
        lat: 61.63644183145977,
      })
      .expect(200)
      .expect('Location', /api\/dev\/steder\/400000000000000000000000/)
      .expect(res => {
        assert.deepEqual(res.body, {
          message: 'Ok',
          data: {
            _id: res.body.data._id,
            dnt_user_id: 1234,
            location: { type: 'Point', coordinates: [8.312466144561768, 61.63644183145977] },
            public: false,
            ntb_steder_id: '400000000000000000000000',
            timestamp: res.body.data.timestamp,
          },
        });
      })
  ));

  it('stores new checkins as public when public=true', () => (
    app.post(url)
      .set('X-User-Id', '1234')
      .set('X-User-Token', 'abc123')
      .send({
        sted: '400000000000000000000000',
        lon: 8.312466144561768,
        lat: 61.63644183145977,
        public: true,
      })
      .expect(200)
      .expect(res => {
        assert.equal(res.body.data.public, true);
      })
  ));

  it('saves reference to new checkin to user profile', done => {
    app.post(url)
      .set('X-User-Id', '1234')
      .set('X-User-Token', 'abc123')
      .send({
        sted: '400000000000000000000000',
        lon: 8.312466144561768,
        lat: 61.63644183145977,
      })
      .end((err, res) => {
        assert.ifError(err);

        User.findOne({ _id: 1234 }).then(user => process.nextTick(() => {
          // Convert checkin ObjectIDs to Strings
          const innsjekkinger = user.innsjekkinger.map(i => i.toString());

          assert.deepEqual(innsjekkinger, [
            '200000000000000000000000',
            '200000000000000000000001',
            res.body.data._id,
          ]);

          done();
        }));
      });
  });
});

describe('GET /steder/:sted/besok/:id', () => {
  const url = '/api/dev/steder/524081f9b8cb77df15001660/besok';

  it('returns 400 for invalid checkin _id');

  it('returns 404 for non-existing checkin', () => (
    app.get(`${url}/000000000000000000000000`)
      .expect(404)
      .expect({
        code: 404,
        message: 'Checkin not found',
      })
  ));

  it('returns 200 for existing checkin', () => (
    app.get(`${url}/200000000000000000000000`)
      .expect(200)
      .expect({
        data: JSON.parse(JSON.stringify(checkins[0])),
      })
  ));
});

describe('GET /steder/:sted/stats', () => {
  const url = '/api/dev/steder/400000000000000000000001/stats';

  it('returns checkin statistics for a given place', () => (
    app.get(url)
      .expect(200)
      .expect({ data: { count: 2 } })
  ));
});

describe('GET /steder/:sted/logg', () => {
  const url = '/api/dev/steder/400000000000000000000001/logg';

  const data = [
    JSON.parse(JSON.stringify(checkins[1])),
    JSON.parse(JSON.stringify(checkins[2])),
  ].map(c => {
    delete c.dnt_user_id;
    return c;
  });

  it('returns the most recent checkins', () => (
    app.get(url)
      .expect(200)
      .expect(res => {
        assert.deepEqual(res.body, { data });
      })
  ));
});
