/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
'use strict';

const assert = require('assert');
const mockery = require('mockery');
const path = require('path');

describe('secrets', () => {
  beforeEach(done => {
    const resolved = require.resolve(path.resolve(__dirname, '../../src/lib/secrets'));
    delete require.cache[resolved];
    done();
  });

  describe('development', () => {
    it('gets secrets from process', done => {
      process.env.NODE_ENV = 'development';
      const secrets = require('../../src/lib/secrets');

      assert(secrets.NTB_API_KEY, 'fake');

      done();
    });
  });

  describe('test', () => {
    it('gets secrets from process', done => {
      process.env.NODE_ENV = 'test';
      const secrets = require('../../src/lib/secrets');

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
          NEW_RELIC_LICENSE_KEY: 'abc123',
          AWS_ACCESS_KEY_ID: 'abc',
          AWS_SECRET_ACCESS_KEY: 'abc123',
          API_CLIENT_TOKENS: 'client123,client456',
          MONGO_URI: 'mongodb://some.mongo.uri:12345/database-name',
        });

        return file;
      },
    }));

    it('reads secrets.json in production', done => {
      process.env.NODE_ENV = 'production';
      const secrets = require('../../src/lib/secrets');

      assert.deepEqual(secrets, {
        NTB_API_KEY: 'abc',
        NEW_RELIC_LICENSE_KEY: 'abc123',
        AWS_ACCESS_KEY_ID: 'abc',
        AWS_SECRET_ACCESS_KEY: 'abc123',
        API_CLIENT_TOKENS: 'client123,client456',
        MONGO_URI: 'mongodb://some.mongo.uri:12345/database-name',
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
