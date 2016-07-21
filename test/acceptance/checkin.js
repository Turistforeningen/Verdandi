'use strict';
/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */

const assert = require('assert');
const request = require('supertest');
const app = request(require('../../index'));

describe('POST /steder/:sted/besok', () => {
  const url = '/api/dev/steder/524081f9b8cb77df15001660/besok';

  it('returns error for missing user auth', done => {
    app.post(url)
      .send({ lon: -117.220406, lat: 32.719464 })
      .expect(401)
      .expect({
        code: 401,
        message: 'X-User-Id header is required',
      }, done);
  });

  it('returns error for invalid coordinates', done => {
    app.post(url)
      .set('X-User-Id', '1234')
      .set('X-User-Token', 'abc123')
      .send({ lon: 1337, lat: 4444 })
      .expect(400)
      .expect({
        code: 400,
        message: 'Longitude must be between -180 and 180.  Got 1337.',
      })
      .end(done);
  });

  it('stores new checkin to the database', done => {
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
            dnt_user_id: 1234,
            id: res.body.data.id,
            location: {
              $reql_type$: 'GEOMETRY',
              coordinates: [-117.220406, 32.719464],
              type: 'Point',
            },
            ntb_steder_id: '524081f9b8cb77df15001660',
            timestamp: res.body.data.timestamp,
          },
        });
      })
      .end(done);
  });
});

describe('GET /steder/:sted/besok/:id', () => {
  const url = '/api/dev/steder/524081f9b8cb77df15001660/besok';

  it('returns 404 for non-existing checkin', done => {
    app.get(`${url}/does-not-exist`)
      .expect(404)
      .expect({
        code: 404,
        message: 'Checkin not found',
      })
      .end(done);
  });

  it('returns 200 for existing checkin', done => {
    app.get(`${url}/7644aaf2-9928-4231-aa68-4e65e31bf219`)
      .expect(200)
      .expect({
        data: {
          id: '7644aaf2-9928-4231-aa68-4e65e31bf219',
          dnt_user_id: 1234,
          ntb_steder_id: '524081f9b8cb77df15001660',
          location: {
            $reql_type$: 'GEOMETRY',
            coordinates: [ -117.220406, 32.719464 ],
            type: 'Point',
          },
          timestamp: '2016-07-07T23:32:49.923Z',
        },
      })
      .end(done);
  });
});

describe('GET /steder/:sted/stats', () => {
  it('returns checkin statistics for a given place', done => {
    const url = '/api/dev/steder/524081f9b8cb77df15001660/stats';

    app.get(url)
      .expect(200)
      .expect({ data: { count: 2 } })
      .end(done);
  });
});

describe('GET /steder/:sted/logg', () => {
  const url = '/api/dev/steder/524081f9b8cb77df15001660/logg';

  it('returns the most recent checkins', done => {
    app.get(url)
      .expect(200)
      .expect(res => {
        assert.deepEqual(res.body, { data: [{
          dnt_user_id: 1234,
          id: '7644aaf2-9928-4231-aa68-4e65e31bf219',
          location: {
            $reql_type$: 'GEOMETRY',
            coordinates: [-117.220406, 32.719464],
            type: 'Point',
          },
          ntb_steder_id: '524081f9b8cb77df15001660',
          timestamp: '2016-07-07T23:32:49.923Z',
        }, {
          dnt_user_id: 5678,
          id: '7644aaf2-9928-4231-aa68-4e65e31bf217',
          location: {
            $reql_type$: 'GEOMETRY',
            coordinates: [-117.220406, 32.719464],
            type: 'Point',
          },
          ntb_steder_id: '524081f9b8cb77df15001660',
          timestamp: '2016-07-06T23:32:58.923Z',
        }] });
      })
      .end(done);
  });
});
