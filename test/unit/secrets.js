/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
'use strict';

const assert = require('assert');
const mockery = require('mockery');

describe('secrets', () => {
  beforeEach(done => {
    const resolved = require.resolve(__dirname + '/../../lib/secrets');
    delete require.cache[resolved];
    done();
  });

  describe('development', () => {
    it('gets secrets from process', done => {
      process.env.NODE_ENV = 'development';
      const secrets = require('../../lib/secrets');

      assert(secrets.NTB_API_KEY, 'fake');

      done();
    });
  });

  describe('test', () => {
    it('gets secrets from process', done => {
      process.env.NODE_ENV = 'test';
      const secrets = require('../../lib/secrets');

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
        return '{"PROD_KEY":"abc","PROD_INT": 123,"PROD_BOOL":true}';
      }
    }));


    it('reads secrets.json in production', done => {
      process.env.NODE_ENV = 'production';
      const secrets = require('../../lib/secrets');

      assert.deepEqual(secrets, {
        PROD_KEY: 'abc',
        PROD_INT: 123,
        PROD_BOOL: true,
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
