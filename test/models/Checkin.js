/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
'use strict';

const assert = require('assert');
const mockery = require('mockery');

describe('Checkin', () => {
  before(() => mockery.enable({
    useCleanCache: true,
    warnOnReplace: false,
    warnOnUnregistered: false,
  }));

  afterEach(() => mockery.deregisterMock('node-fetch'));

  after(() => mockery.disable());

  describe('#getCheckinsForList()', () => {
    it('it returns existing checkins for existing list', () => {
      // Mock node-fetch
      mockery.registerMock('node-fetch', () => Promise.resolve({
        status: 200,
        json: () => ({
          steder: ['400000000000000000000000', '400000000000000000000001'],
        }),
      }));

      // Require Checkin (it now uses the mock above)
      const Checkin = require('../../models/Checkin'); // eslint-disable-line global-require

      return Checkin.getCheckinsForList('300000000000000000000000')
        .then(checkins => {
          assert.equal(checkins.length, 3);
        });
    });
  });
});
