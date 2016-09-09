/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
'use strict';

const mockery = require('mockery');
const assert = require('assert');

let ntb = require('../../lib/ntb');

describe('ntb', () => {
  describe('#getNtbObject()', () => {
    beforeEach(() => mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false,
    }));

    afterEach(() => mockery.deregisterMock('node-fetch'));
    afterEach(() => mockery.disable());

    it('returns 404 if not found', done => {
      mockery.registerMock('node-fetch', () => Promise.resolve({
        status: 404,
        json: () => ({ message: 'Not Found' }),
      }));

      ntb = require('../../lib/ntb'); // eslint-disable-line global-require

      ntb.getNtbObject('900000000000000000000000')
        .then(result => process.nextTick(() => {
          assert.equal(result.status, 404);
          done();
        }));
    });

    it('returns data if found', done => {
      mockery.registerMock('node-fetch', () => Promise.resolve({
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
      }));

      ntb = require('../../lib/ntb'); // eslint-disable-line global-require

      ntb.getNtbObject('400000000000000000000000')
        .then(result => process.nextTick(() => {
          const sted = result.json();
          assert.equal(sted._id, 400000000000000000000000);
          done();
        }));
    });
  });

  describe('#middleware()', () => {
    beforeEach(() => mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false,
    }));

    afterEach(() => mockery.deregisterMock('node-fetch'));
    afterEach(() => mockery.disable());

    it('returns error if not found', done => {
      mockery.registerMock('node-fetch', () => Promise.resolve({
        status: 404,
        json: () => ({ message: 'Not Found' }),
      }));

      ntb = require('../../lib/ntb'); // eslint-disable-line global-require

      ntb.middleware({ params: { sted: '900000000000000000000000' } }, {}, err => {
        assert.equal(err.code, 404);
        done();
      });
    });

    it('returns data if found', done => {
      mockery.registerMock('node-fetch', () => Promise.resolve({
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
      }));

      ntb = require('../../lib/ntb'); // eslint-disable-line global-require

      const req = { params: { sted: '400000000000000000000000' } };

      ntb.middleware(req, {}, () => {
        assert.equal(req.ntb_steder_object._id, '400000000000000000000000');
        done();
      });
    });
  });
});
