/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
'use strict';

const assert = require('assert');
const request = require('supertest');
const app = request(require('../../index'));

describe('POST /steder/:sted/besok', () => {
  const url = '/api/dev/steder/524081f9b8cb77df15001660/besok';

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
      .send({ lon: -117.220406, lat: 32.719464 })
      .expect(200)
      .expect('Location', /api\/dev\/steder\/524081f9b8cb77df15001660/)
      .expect(res => {
        assert.deepEqual(res.body, {
          message: 'Ok',
          data: {
            _id: res.body.data._id,
            dnt_user_id: 1234,
            location: {
              coordinates: [-117.220406, 32.719464],
              type: 'Point',
            },
            ntb_steder_id: '524081f9b8cb77df15001660',
            timestamp: res.body.data.timestamp,
          },
        });
      })
  ));
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
        data: {
          _id: '200000000000000000000000',
          dnt_user_id: 1234,
          location: {
            coordinates: [-117.220406, 32.719464],
            type: 'Point',
          },
          ntb_steder_id: '300000000000000000000000',
          timestamp: '2016-07-07T23:32:49.923Z',
        },
      })
  ));
});

describe('GET /steder/:sted/stats', () => {
  const url = '/api/dev/steder/300000000000000000000001/stats';

  it('returns checkin statistics for a given place', () => (
    app.get(url)
      .expect(200)
      .expect({ data: { count: 2 } })
  ));
});

describe('GET /steder/:sted/logg', () => {
  const url = '/api/dev/steder/300000000000000000000001/logg';

  it('returns the most recent checkins', () => (
    app.get(url)
      .expect(200)
      .expect(res => {
        assert.deepEqual(res.body, { data: [{
          _id: '200000000000000000000001',
          timestamp: '2016-07-07T23:32:50.923Z',
          location: { type: 'Point', coordinates: [-117.220406, 32.719464] },
          ntb_steder_id: '300000000000000000000001',
          dnt_user_id: 1234,
        }, {
          _id: '200000000000000000000002',
          timestamp: '2016-07-06T23:32:58.923Z',
          location: { type: 'Point', coordinates: [-117.220406, 32.719464] },
          ntb_steder_id: '300000000000000000000001',
          dnt_user_id: 5678,
        }] });
      })
  ));
});
