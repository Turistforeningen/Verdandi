'use strict';

const auth = require('../../lib/auth');
const assert = require('assert');
const dntUsers = require('../fixtures/dnt-users');
const users = require('../fixtures/users');
const User = require('../../models/User');

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
      auth.getUserData(process.env.OAUTH_ACCESS_TOKEN)
        .then(user => process.nextTick(() => {
          assert.equal(typeof user.fornavn, 'string');
          assert.equal(typeof user.etternavn, 'string');
          assert.equal(typeof user.epost, 'string');
          assert.equal(user.sherpa_id, process.env.OAUTH_USER_ID);
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

  describe('#middleware()', () => {
    it('returns 401 error for missing x-user-id header', done => {
      auth.middleware({ headers: {} }, {}, error => {
        assert.equal(error.message, 'X-User-Id header is required');
        assert.equal(error.code, 401);
        done();
      });
    });

    it('returns 401 error for missing x-user-token header', done => {
      const req = { headers: { 'x-user-id': 1234 } };
      auth.middleware(req, {}, error => {
        assert.equal(error.message, 'X-User-Token header is required');
        assert.equal(error.code, 401);
        done();
      });
    });

    it('returns 403 error for invalid user token', done => {
      const req = { headers: { 'x-user-id': 1234, 'x-user-token': 'abcd' } };
      auth.middleware(req, {}, error => {
        assert.equal(error.message, 'User authentication failed');
        assert.equal(error.code, 403);
        done();
      });
    });

    it('accepts valid user token', done => {
      const req = { headers: {
        'x-user-id': process.env.OAUTH_USER_ID,
        'x-user-token': process.env.OAUTH_ACCESS_TOKEN,
      } };
      auth.middleware(req, {}, error => process.nextTick(() => {
        assert.ifError(error);
        assert.equal(typeof req.user, 'object');
        assert.equal(req.user.id, process.env.OAUTH_USER_ID);
        done();
      }));
    });
  });
});
