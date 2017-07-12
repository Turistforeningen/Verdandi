/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
'use strict';

const assert = require('assert');
const request = require('supertest');
const auth = require('../../lib/auth');

const User = require('../../models/User');
const dntUsers = require('../fixtures/dnt-users');
const users = require('../fixtures/users');
const checkins = require('../fixtures/checkins.js');
const photos = require('../fixtures/photos.js');
const mockery = require('mockery');

const getUserData = auth.getUserData;

describe('POST /steder/:sted/besok', () => {
  let appMocked;
  let authMocked;

  before(() => mockery.enable({
    useCleanCache: true,
    warnOnReplace: false,
    warnOnUnregistered: false,
  }));

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

  before(() => {
    appMocked = request(require('../../index')); // eslint-disable-line global-require
  });

  before(() => {
    authMocked = require('../../lib/auth'); // eslint-disable-line global-require

    authMocked.getUserData = () => Promise.resolve(dntUsers[1]);
  });

  after(() => {
    authMocked.getUserData = getUserData;
  });

  after(() => mockery.deregisterMock('node-fetch'));
  after(() => mockery.disable());

  const url = '/api/dev/steder/400000000000000000000000/besok';
  const checkinData = {
    lon: 8.312466144561768,
    lat: 61.63644183145977,
    timestamp: '2016-08-01T23:59:59.923Z',
    public: false,
  };

  it('returns error for missing user auth', () => (
    appMocked.post(url)
      .send(checkinData)
      .expect(401)
      .expect({
        code: 401,
        message: 'X-User-Id header is required',
      })
  ));

  it('returns error for invalid coordinates', () => (
    appMocked.post(url)
      .set('X-User-Id', '1234')
      .set('X-User-Token', 'abc123')
      .send({ lon: 1337, lat: 4444 })
      .expect(400)
      .expect(res => {
        assert.equal(res.body.code, 400);
        assert.equal(res.body.message, 'Checkin validation failed');
        assert.equal(typeof res.body.errors['location.coordinates.0'], 'object');
        assert.equal(typeof res.body.errors['location.coordinates.1'], 'object');
      })
  ));

  it('returns error for checkins from the future', () => {
    const checkinDataBeforeTimeout = JSON.parse(JSON.stringify(checkinData));
    const now = new Date();
    checkinDataBeforeTimeout.timestamp = now.setHours(now.getHours() + 24);
    return appMocked.post(url)
      .set('X-User-Id', '1234')
      .set('X-User-Token', 'abc123')
      .send(checkinDataBeforeTimeout)
      .expect(400)
      .expect(res => {
        assert.equal(typeof res.body.errors.timestamp, 'object');
        assert.equal(/from the future/.test(res.body.errors.timestamp.message), true);
        assert.equal(res.body.code, 400);
        assert.equal(res.body.message, 'Checkin validation failed');
      });
  });

  it('returns error for second checkin before checkin timeout', () => {
    const checkinDataBeforeTimeout = JSON.parse(JSON.stringify(checkinData));
    const checkinTimestamp = new Date(checkins[0].timestamp);
    const invalidCheckinTimestamp = new Date(checkinTimestamp.setSeconds(
      checkinTimestamp.getSeconds() + parseInt(process.env.CHECKIN_TIMEOUT, 10) - 1 // eslint-disable-line no-mixed-operators, max-len
    ));
    checkinDataBeforeTimeout.timestamp = invalidCheckinTimestamp.toISOString();

    return appMocked.post(url)
      .set('X-User-Id', '1234')
      .set('X-User-Token', 'abc123')
      .send(checkinDataBeforeTimeout)
      .expect(400)
      .expect(res => {
        assert.equal(typeof res.body.errors.timestamp, 'object');
        assert.equal(res.body.code, 400);
        assert.equal(res.body.message, 'Checkin validation failed');
      });
  });

  it('stores new valid checkin to the database', () => (
    appMocked.post(url)
      .set('X-User-Id', '1234')
      .set('X-User-Token', 'abc123')
      .send(checkinData)
      .expect(200)
      .expect('Location', /api\/dev\/steder\/400000000000000000000000/)
      .expect(res => {
        const { data, message } = res.body;
        assert.equal(message, 'Ok');
        assert.equal(data.ntb_steder_id, '400000000000000000000000');
        assert.deepEqual(data.location, {
          coordinates: [checkinData.lon, checkinData.lat],
          type: 'Point',
        });
        assert.equal(data.user._id, 1234);
        assert.equal(data.user.innsjekkinger[2], data._id);
      })
  ));

  it('supports checkin with photo', () => (
    appMocked.post(url)
      .set('X-User-Id', '1234')
      .set('X-User-Token', 'abc123')
      .field('lat', checkinData.lat)
      .field('lon', checkinData.lon)
      .field('timestamp', checkinData.timestamp)
      .attach('photo', 'test/fixtures/doge.jpg')
      .expect(200)
      .expect('Location', /api\/dev\/steder\/400000000000000000000000/)
      .expect(res => {
        assert.equal(res.body.data.dnt_user_id, 1234);
        assert.equal(res.body.data.comment, checkinData.comment);
        assert.equal(res.body.data.public, checkinData.public);
        assert.equal(res.body.data.ntb_steder_id, '400000000000000000000000');
        assert.equal(res.body.data.timestamp, checkinData.timestamp);
        assert.deepEqual(res.body.data.location, {
          coordinates: [checkinData.lon, checkinData.lat],
          type: 'Point',
        });
        assert.equal(typeof res.body.data.photo.versions, 'object');
        assert.equal(typeof res.body.data.photo.versions[0].url, 'string');
        assert.equal(typeof res.body.data.photo.versions[0].height, 'number');
        assert.equal(typeof res.body.data.photo.versions[0].width, 'number');
        assert.equal(typeof res.body.data.photo.versions[0].etag, 'string');
        assert.equal(typeof res.body.data.photo.versions[0].awsImageAcl, 'undefined');
      })
  ));

  it('stores new checkins as public when public=true', () => {
    const publicCheckinData = checkinData;
    publicCheckinData.public = true;

    return appMocked.post(url)
      .set('X-User-Id', '1234')
      .set('X-User-Token', 'abc123')
      .send(publicCheckinData)
      .expect(200)
      .expect(res => {
        assert.equal(res.body.data.public, true);
      });
  });

  it('saves reference to new checkin to user profile', done => {
    appMocked.post(url)
      .set('X-User-Id', '1234')
      .set('X-User-Token', 'abc123')
      .send(checkinData)
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

describe('PUT /steder/:sted/besok/:id', () => {
  let appMocked;
  let authMocked;

  before(() => mockery.enable({
    useCleanCache: true,
    warnOnReplace: false,
    warnOnUnregistered: false,
  }));

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

  before(() => {
    appMocked = request(require('../../index')); // eslint-disable-line global-require
  });

  before(() => {
    authMocked = require('../../lib/auth'); // eslint-disable-line global-require

    authMocked.getUserData = () => Promise.resolve(dntUsers[1]);
  });

  after(() => {
    authMocked.getUserData = getUserData;
  });

  after(() => mockery.deregisterMock('node-fetch'));
  after(() => mockery.disable());

  const url = '/api/dev/steder/400000000000000000000000/besok';
  const checkinData = {
    lon: 8.312466144561768,
    lat: 61.63644183145977,
    timestamp: '2016-08-01T23:59:59.923Z',
    public: false,
  };

  it('updates a checkin on PUT', () => {
    const guestbookCheckinData = Object.assign({}, checkinData, {
      public: true,
      comment: 'Mitt favorittsted, dette her!',
    });

    return appMocked.put(`${url}/200000000000000000000000`)
      .set('X-User-Id', '1234')
      .set('X-User-Token', 'abc123')
      .send(guestbookCheckinData)
      .expect(200)
      .expect(res => {
        assert.equal(res.body.data.public, true);
        assert.equal(res.body.data.comment, 'Mitt favorittsted, dette her!');
      });
  });

  it('returns 404 for PUT to non existing checkin', () => (
    appMocked.put(`${url}/400000000000000000000004`)
      .set('X-User-Id', '1234')
      .set('X-User-Token', 'abc123')
      .send()
      .expect(404)
  ));

  it('returns 403 for PUT to other users\' checkin', () => (
    appMocked.put(`${url}/200000000000000000000002`)
      .set('X-User-Id', '1234')
      .set('X-User-Token', 'abc123')
      .send()
      .expect(403)
  ));

  it('updates a checkin with photo on PUT', () => {
    const guestbookCheckinData = Object.assign({}, checkinData, {
      public: true,
      comment: 'Mitt favorittsted, dette her!',
      photo: 'test/fixtures/doge.jpg',
    });

    return appMocked.put(`${url}/200000000000000000000000`)
      .set('X-User-Id', '1234')
      .set('X-User-Token', 'abc123')
      .field('public', `${guestbookCheckinData.public}`)
      .field('comment', guestbookCheckinData.comment)
      .attach('photo', 'test/fixtures/doge.jpg')
      .expect(200)
      .expect(res => {
        const { data } = res.body;
        assert.ok(data.photo);
        assert.equal(typeof data.photo.versions, 'object');
      });
  });

  it('sets non required fields to null if missing in PUT', () => (
    appMocked.put(`${url}/200000000000000000000003`)
    .set('X-User-Id', '1234')
    .set('X-User-Token', 'abc123')
    .send(checkinData)
    .expect(200)
    .expect(res => {
      assert.equal(res.body.data.comment, null);
      assert.equal(res.body.data.photo, null);
    })
  ));
});

describe('DELETE /steder/:sted/besok/:id', () => {
  const url = '/api/dev/steder/400000000000000000000000/besok';

  let appMocked;
  let authMocked;

  before(() => mockery.enable({
    useCleanCache: true,
    warnOnReplace: false,
    warnOnUnregistered: false,
  }));

  before(() => {
    appMocked = request(require('../../index')); // eslint-disable-line global-require
  });

  before(() => {
    authMocked = require('../../lib/auth'); // eslint-disable-line global-require

    authMocked.getUserData = token => (
      token === 'client123' ? Promise.resolve(dntUsers[1]) : Promise.reject()
    );
  });

  after(() => {
    authMocked.getUserData = getUserData;
  });

  after(() => mockery.deregisterMock('node-fetch'));
  after(() => mockery.disable());

  it('deletes a checkin on DELETE', () => (
    appMocked.delete(`${url}/200000000000000000000000`)
      .set('X-Client-Token', 'client123')
      .expect(200)
  ));

  it('returns 404 for DELETE to non existing checkin', () => (
    appMocked.delete(`${url}/400000000000000000000004`)
      .set('X-Client-Token', 'client123')
      .send()
      .expect(404)
  ));

  it('returns 403 for DELETE to other users\' checkin', () => (
    appMocked.delete(`${url}/200000000000000000000002`)
      .set('X-User-Id', '1234')
      .set('X-User-Token', 'abc123')
      .send()
      .expect(403)
  ));

  it('returns 403 for DELETE with invalid credentials', () => (
    appMocked.delete(`${url}/200000000000000000000000`)
      .set('X-User-Id', '1234')
      .set('X-User-Token', 'invalid')
      .send()
      .expect(403)
  ));

  it('returns 401 for DELETE with missing credentials', () => (
    appMocked.delete(`${url}/200000000000000000000000`)
      .send()
      .expect(401)
  ));
});

describe('Checkin', () => {
  let appMocked;
  let authMocked;

  before(() => mockery.enable({
    useCleanCache: true,
    warnOnReplace: false,
    warnOnUnregistered: false,
  }));

  before(() => {
    appMocked = request(require('../../index')); // eslint-disable-line global-require
  });

  before(() => {
    authMocked = require('../../lib/auth'); // eslint-disable-line global-require

    authMocked.getUserData = () => Promise.resolve(dntUsers[1]);
  });

  after(() => {
    authMocked.getUserData = getUserData;
  });

  after(() => mockery.disable());

  describe('GET /steder/:sted/besok/:id', () => {
    const url = '/api/dev/steder/524081f9b8cb77df15001660/besok';

    it('returns 400 for invalid checkin _id', () => (
      appMocked.get(`${url}/invalid`)
        .expect(400)
        .expect({
          code: 400,
          message: 'Invalid ObjectId',
        })
    ));

    it('returns 404 for non-existing checkin', () => (
      appMocked.get(`${url}/000000000000000000000000`)
        .expect(404)
        .expect({
          code: 404,
          message: 'Checkin not found',
        })
    ));

    it('returns 403 for existing non public checkin', () => (
      appMocked.get(`${url}/200000000000000000000000`)
        .expect(403)
    ));

    it('returns 200 with limited details for existing public checkin', () => (
      appMocked.get(`${url}/200000000000000000000001`)
        .expect(200)
        .expect(res => {
          const { data } = res.body;
          assert.equal(data._id, 200000000000000000000001);
          assert.ok(!!data.user._id);
          assert.equal(typeof data.user.navn, 'string');
        })
    ));

    it('returns 200 and populated for existing checkin request by owner', () => (
      appMocked.get(`${url}/200000000000000000000001`)
        .set('X-User-Id', '1234')
        .set('X-User-Token', 'abc123')
        .expect(200)
        .expect(res => {
          const { data } = res.body;
          assert.equal(data._id, 200000000000000000000001);
          assert.deepEqual(data.user, JSON.parse(JSON.stringify(users[0])));
          assert.deepEqual(data.photo, JSON.parse(JSON.stringify(photos[0])));
        })
    ));
  });

  describe('GET /steder/:sted/logg', () => {
    const url = '/api/dev/steder/400000000000000000000001/logg';

    it('returns the most recent checkins', () => (
      appMocked.get(url)
        .expect(200)
        .expect(res => {
          assert.equal(res.body.data.length, 3);
        })
    ));

    it('respects query param public', () => (
      appMocked.get(`${url}?public=true`)
        .expect(200)
        .expect(res => {
          const { data } = res.body;
          data.forEach(checkin => assert.equal(checkin.public, true));
        })
    ));

    it('populates location, limited user, and photo for public checkins', () => (
      appMocked.get(url)
        .expect(200)
        .expect(res => {
          res.body.data.forEach(checkin => {
            if (checkin.public === true) {
              assert.notEqual(checkin.location, null);
              assert.ok(!!checkin.user._id);
              assert.ok(checkin.photo);
            }
          });
        })
    ));

    it('populates location, full user, and photo for own checkins', () => (
      appMocked.get(url)
        .set('X-User-Id', '1234')
        .set('X-User-Token', 'abc123')
        .expect(res => {
          res.body.data.forEach(checkin => {
            if (checkin.user && checkin.user.navn === 'Ole Olsen') {
              assert.notEqual(checkin.location, null);
              assert.ok(checkin.user._id);
            }
          });
        })
    ));
  });
});
