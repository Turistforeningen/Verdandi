'use strict';

const assert = require('assert');
const request = require('supertest');
const app = request(require('../../index'));

describe('POST /steder/:sted/besok', () => {
  const url = '/api/dev/steder/524081f9b8cb77df15001660/besok';

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

describe('GET /steder/:sted/stats', () => {
  it('returns checkin statistics for this place');
});

describe('GET /steder/:sted/logg', () => {
  it('returns the most recent checkins');
});
