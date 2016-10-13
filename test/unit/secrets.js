/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
'use strict';

const assert = require('assert');
const mockery = require('mockery');
const path = require('path');

describe('secrets', () => {
  beforeEach(done => {
    const resolved = require.resolve(path.resolve(__dirname, '../../lib/secrets'));
    delete require.cache[resolved];
    done();
  });

  describe('development', () => {
    it('gets secrets from process', done => {
      process.env.NODE_ENV = 'development';
      const secrets = require('../../lib/secrets'); // eslint-disable-line global-require

      assert(secrets.NTB_API_KEY, 'fake');

      done();
    });
  });

  describe('test', () => {
    it('gets secrets from process', done => {
      process.env.NODE_ENV = 'test';
      const secrets = require('../../lib/secrets'); // eslint-disable-line global-require

      assert(secrets.NTB_API_KEY, 'fake');

      done();
    });
  });

  describe('production', () => {
    before(() => mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false,
    }));

    before(() => mockery.registerMock('fs', {
      readFileSync() {
        const file = JSON.stringify({
          NTB_API_KEY: 'abc',
          OAUTH_CLIENT_ID: 'def',
          OAUTH_CLIENT_SECRET: 'geh',
          OAUTH_ACCESS_TOKEN: true,
          OAUTH_REFRESH_TOKEN: 123,
        });

        return file;
      },
    }));

    it('reads secrets.json in production', done => {
      process.env.NODE_ENV = 'production';
      const secrets = require('../../lib/secrets'); // eslint-disable-line global-require

      assert.deepEqual(secrets, {
        NTB_API_KEY: 'abc',
        OAUTH_CLIENT_ID: 'def',
        OAUTH_CLIENT_SECRET: 'geh',
        OAUTH_ACCESS_TOKEN: true,
        OAUTH_REFRESH_TOKEN: 123,
      });

      done();
    });

    after(() => mockery.deregisterMock('fs'));

    after(() => mockery.disable());
  });

  after(done => {
    process.env.NODE_ENV = 'test';
    done();
  });
});