/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
'use strict';

const assert = require('assert');
const mockery = require('mockery');

describe('Checkin', () => {
  describe('#getCheckinsForList()', () => {
    before(() => mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false,
    }));

    afterEach(() => mockery.deregisterMock('node-fetch'));

    after(() => mockery.disable());

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

  describe('#saveCheckin()', () => {
    let Checkin;

    before(() => mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false,
    }));

    beforeEach(() => mockery.registerMock('node-fetch', () => Promise.resolve({
      status: 200,
      json: () => ({
        _id: '400000000000000000000000',
        geojson: { type: 'Point', coordinates: [8.31323888888889, 61.63635277777777] },
      }),
    })));

    afterEach(() => mockery.deregisterMock('node-fetch'));

    after(() => mockery.disable());

    it('rejects checkin from position outside radius', done => {
      Checkin = require('../../models/Checkin'); // eslint-disable-line global-require

      const checkin = new Checkin({
        dnt_user_id: 1234,
        ntb_steder_id: '400000000000000000000000',
        timestamp: '2016-07-09T23:50:50.923Z',
        location: { coordinates: [8.304591, 61.635695] },
      });
      checkin.save((err, doc) => {
        assert.equal(typeof doc, 'undefined');
        done();
      });
    });

    it('saves checkin from position inside radius', done => {
      const checkinData = {
        dnt_user_id: 1234,
        ntb_steder_id: '400000000000000000000000',
        timestamp: '2016-07-09T23:50:50.923Z',
        location: { coordinates: [8.312466144561768, 61.63644183145977] },
      };
      const checkin = new Checkin(checkinData);

      checkin.save((err, doc) => {
        assert.equal(err, null);
        assert.equal(doc.ntb_steder_id, checkinData.ntb_steder_id);
        done();
      });
    });

    it('rejects a second checkin before checkin timeout', done => {
      const checkinData = {
        dnt_user_id: 1234,
        ntb_steder_id: '400000000000000000000000',
        timestamp: '2016-07-07T23:50:50.923Z',
        location: { coordinates: [8.312466144561768, 61.63644183145977] },
      };
      const checkin = new Checkin(checkinData);

      checkin.save((err, doc) => {
        assert.equal(typeof doc, 'undefined');
        assert.equal(typeof err.errors.timestamp, 'object');
        done();
      });
    });

    it('rejects a checkin from the future', done => {
      const checkinData = {
        dnt_user_id: 1234,
        ntb_steder_id: '400000000000000000000000',
        timestamp: new Date().setHours(new Date().getHours() + 24),
        location: { coordinates: [8.312466144561768, 61.63644183145977] },
      };
      const checkin = new Checkin(checkinData);

      checkin.save((err, doc) => {
        assert.equal(typeof doc, 'undefined');
        assert.equal(typeof err.errors.timestamp, 'object');
        done();
      });
    });
  });
});
