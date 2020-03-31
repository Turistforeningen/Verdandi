'use strict';

const assert = require('assert');
const HttpError = require('@starefossen/http-error');

const auth = require('../../src/lib/auth');
const dntUsers = require('../fixtures/dnt-users');
const users = require('../fixtures/users');
const User = require('../../src/models/User');
const secrets = require('../../src/lib/secrets');
const cache = require('../../src/lib/cache');

describe('lib/auth', () => {
  describe('#getUserData()', () => {
    it('rejects invalid oauth token', done => {
      auth.getUserData('invalid').catch(error => process.nextTick(() => {
        assert.equal(error.message, 'Status Code 403');
        assert.equal(error.code, 403);
        done();
      }));
    });

    it('resolves user data for valid token', done => {
      auth.getUserData(secrets.OAUTH_ACCESS_TOKEN)
        .then(user => process.nextTick(() => {
          assert.equal(typeof user.fornavn, 'string');
          assert.equal(typeof user.etternavn, 'string');
          assert.equal(typeof user.epost, 'string');
          assert.equal(user.sherpa_id, secrets.OAUTH_USER_ID);
          done();
        }))
        .catch(done);
    });
  });

  describe('#userVerify', () => {
    it('authenticates user with valid token', done => {
      const id = Number(secrets.OAUTH_USER_ID);

      auth.userVerify(id, secrets.OAUTH_ACCESS_TOKEN)
        .then(result => {
          assert.equal(id, result._id);
          done();
        });
    });

    it('caches authenticated user', done => {
      const id = Number(secrets.OAUTH_USER_ID);
      const token = secrets.OAUTH_ACCESS_TOKEN;

      auth.userVerify(id, token)
        .then(user => (
          cache.get(`user:${id}:${token}`)
            .then(result => {
              assert.equal(id, JSON.parse(result)._id);
              done();
            })
        ));
    });

    it('sets the cached token to expire in 86400 seconds', done => {
      const id = Number(secrets.OAUTH_USER_ID);
      const token = secrets.OAUTH_ACCESS_TOKEN;

      auth.userVerify(id, token)
        .then(user => cache.ttl(`user:${id}:${token}`))
        .then(ttl => {
          assert.ok(ttl <= 86400);
          done();
        });
    });

    it('rejects user that does not match Sherpa user ID', done => {
      const id = 'invalid';

      auth.userVerify(id, secrets.OAUTH_ACCESS_TOKEN)
        .catch(reason => {
          assert(reason, `Invalid token for user ${id}`);
          done();
        });
    });
  });

  describe('#saveUserData()', () => {
    it('creates user profile for new user', done => {
      const userData = dntUsers[0];

      auth.saveUserData(userData).then(user => {
        assert.equal(user._id, userData.sherpa_id);
        assert.equal(user.navn, `${userData.fornavn} ${userData.etternavn}`);
        assert.equal(user.epost, userData.epost);
        done();
      });
    });

    it('updates user profile for existing user', done => {
      // Old user data
      const oldUserData = users[0];
      // Set userData to the fixture user matching test case user id
      const newUserData = dntUsers.find(element => oldUserData._id === element.sherpa_id);
      // Update the new user data with a new email address
      newUserData.epost = 'ole@olsen.com';

      auth.saveUserData(newUserData).then(() => {
        User.findOne({ _id: newUserData.sherpa_id })
          .then(user => {
            assert.equal(user._id, newUserData.sherpa_id);
            assert.equal(user.navn, `${newUserData.fornavn} ${newUserData.etternavn}`);
            assert.equal(user.epost, newUserData.epost);
            assert.notEqual(user.epost, oldUserData.epost);
            done();
          });
      });
    });
  });

  describe('#middleware()', () => {
    it('passes HttpError 401 to next if missing X-User-Token header', done => {
      const req = { headers: { 'x-user-id': 1234 } };
      const res = {};
      const next = err => {
        assert.equal(err.code, 401);
        assert.equal(err.message, 'X-User-Token header is required for user auth');
        done();
      };

      auth.middleware(req, res, next);
    });

    it('passes HttpError 401 to next if missing X-User-Id header', done => {
      const req = { headers: { 'x-user-token': 'abc123' } };
      const res = {};
      const next = err => {
        assert(err instanceof HttpError);
        assert.equal(err.code, 401);
        assert.equal(err.message, 'X-User-Id header is required for user auth');
        done();
      };

      auth.middleware(req, res, next);
    });

    it('passes HttpError 401 to next if invalid X-User-Token', done => {
      const req = { headers: { 'x-user-id': 1234, 'x-user-token': 'invalid123' } };
      const res = {};
      const next = err => {
        assert(err instanceof HttpError);
        assert.equal(err.code, 401);
        assert.equal(err.message, `Invalid token for user ${req.headers['x-user-id']}`);
        done();
      };

      auth.middleware(req, res, next);
    });

    it('passes HttpError 401 to next if invalid X-Client-Token', done => {
      const req = { headers: { 'x-client-token': 'invalid123' } };
      const res = {};
      const next = error => {
        assert.equal(error.code, 401);
        assert.equal(error.message, 'Invalid client token');
        done();
      };

      auth.middleware(req, res, next);
    });

    it('adds user to req when authenticated', done => {
      const req = {
        headers: {
          'x-user-id': secrets.OAUTH_USER_ID,
          'x-user-token': secrets.OAUTH_ACCESS_TOKEN,
        },
      };
      const res = {};
      const next = err => {
        assert.equal(typeof err, 'undefined');
        assert.equal(req.authUser._id, secrets.OAUTH_USER_ID);
        assert.equal(req.authUser.isAuthenticated, true);
        done();
      };

      auth.middleware(req, res, next);
    });

    it('adds client to req when authenticated', done => {
      const req = { headers: { 'x-client-token': secrets.API_CLIENT_TOKENS.split(',')[0] } };
      const res = {};
      const next = err => process.nextTick(() => {
        assert.equal(typeof err, 'undefined');
        assert.equal(req.authClient.isAuthenticated, true);
        done();
      });

      auth.middleware(req, res, next);
    });
  });
});
