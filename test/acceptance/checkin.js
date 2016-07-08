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
