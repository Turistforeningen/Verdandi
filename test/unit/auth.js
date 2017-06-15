'use strict';

const auth = require('../../lib/auth');
const assert = require('assert');
const dntUsers = require('../fixtures/dnt-users');
const users = require('../fixtures/users');
const User = require('../../models/User');
const secrets = require('../../lib/secrets');

describe('auth', () => {
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

  describe('#setOrUpdateUserData()', () => {
    it('creates user profile for new user', done => {
      const userData = dntUsers[0];

      auth.setOrUpdateUserData(userData).then(user => {
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

      auth.setOrUpdateUserData(newUserData).then(() => {
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

  describe('#requireAuth()', () => {
    it('returns 401 error for missing x-user-id header', done => {
      auth.requireAuth({ headers: {} }, {}, error => {
        assert.equal(error.message, 'X-User-Id header is required');
        assert.equal(error.code, 401);
        done();
      });
    });

    it('returns 401 error for missing x-user-token header', done => {
      const req = { headers: { 'x-user-id': 1234 } };
      auth.requireAuth(req, {}, error => {
        assert.equal(error.message, 'X-User-Token header is required');
        assert.equal(error.code, 401);
        done();
      });
    });

    it('returns 403 error for invalid user token', done => {
      const req = { headers: { 'x-user-id': 1234, 'x-user-token': 'abcd' } };
      auth.requireAuth(req, {}, error => {
        assert.equal(error.message, 'User authentication failed');
        assert.equal(error.code, 403);
        done();
      });
    });

    it('accepts valid user token', done => {
      const req = { headers: {
        'x-user-id': secrets.OAUTH_USER_ID,
        'x-user-token': secrets.OAUTH_ACCESS_TOKEN,
      } };
      auth.requireAuth(req, {}, error => process.nextTick(() => {
        assert.ifError(error);
        assert.equal(typeof req.user, 'object');
        assert.equal(req.user.id, secrets.OAUTH_USER_ID);
        done();
      }));
    });
  });

  describe('#optionalAuth()', () => {
    it('returns 403 error for invalid user token', done => {
      const req = { headers: { 'x-user-id': 1234, 'x-user-token': 'abcd' } };
      auth.optionalAuth(req, {}, error => {
        assert.equal(error.message, 'User authentication failed');
        assert.equal(error.code, 403);
        done();
      });
    });

    it('accepts valid user token', done => {
      const req = { headers: {
        'x-user-id': secrets.OAUTH_USER_ID,
        'x-user-token': secrets.OAUTH_ACCESS_TOKEN,
      } };
      auth.optionalAuth(req, {}, error => process.nextTick(() => {
        assert.ifError(error);
        assert.equal(typeof req.user, 'object');
        assert.equal(req.user.id, secrets.OAUTH_USER_ID);
        done();
      }));
    });
  });

  describe('#requireClientAuth()', () => {
    it('returns 401 error for missing x-client-token header', done => {
      auth.requireClientAuth({ headers: {} }, {}, error => {
        assert.equal(error.message, 'X-Client-Token header is required');
        assert.equal(error.code, 401);
        done();
      });
    });

    it('returns 403 error for invalid client token', done => {
      const req = { headers: { 'x-client-token': 'aaa' } };
      auth.requireClientAuth(req, {}, error => {
        assert.equal(error.message, 'X-Client-Token is invalid');
        assert.equal(error.code, 403);
        done();
      });
    });

    it('accepts valid client token', done => {
      const req = { headers: {
        'x-client-token': secrets.API_CLIENT_TOKENS.split(',')[0],
      } };
      auth.requireClientAuth(req, {}, error => process.nextTick(() => {
        assert.ifError(error);
        assert.equal(req.validAPIClient, true);
        done();
      }));
    });
  });

  describe('#optionalClientAuth()', () => {
    it('returns ok when omitting x-client-token header', done => {
      const req = { headers: { } };
      auth.optionalClientAuth(req, {}, error => {
        assert.ifError(error);
        assert.equal(req.validAPIClient, false);
        done();
      });
    });

    it('returns 403 error for invalid client token', done => {
      const req = { headers: { 'x-client-token': 'aaa' } };
      auth.optionalClientAuth(req, {}, error => {
        assert.equal(error.message, 'X-Client-Token is invalid');
        assert.equal(error.code, 403);
        done();
      });
    });

    it('accepts valid client token', done => {
      const req = { headers: {
        'x-client-token': secrets.API_CLIENT_TOKENS.split(',')[0],
      } };
      auth.optionalClientAuth(req, {}, error => process.nextTick(() => {
        assert.ifError(error);
        assert.equal(req.validAPIClient, true);
        done();
      }));
    });
  });
});
