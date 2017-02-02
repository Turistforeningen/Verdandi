'use strict';

const objectId = require('mongoose').Types.ObjectId;

module.exports = [{
  _id: objectId('200000000000000000000000'),
  timestamp: new Date('2016-07-07T20:32:49.923Z'),
  location: { type: 'Point', coordinates: [-117.220406, 32.719464] },
  public: false,
  ntb_steder_id: objectId('400000000000000000000000'),
  dnt_user_id: 1234,
  comment: null,
}, {
  _id: objectId('200000000000000000000001'),
  timestamp: new Date('2016-07-07T20:32:50.923Z'),
  location: { type: 'Point', coordinates: [-117.220406, 32.719464] },
  public: true,
  ntb_steder_id: objectId('400000000000000000000001'),
  dnt_user_id: 1234,
  comment: null,
}, {
  _id: objectId('200000000000000000000002'),
  timestamp: new Date('2016-07-06T20:32:58.923Z'),
  location: { type: 'Point', coordinates: [-117.220406, 32.719464] },
  public: false,
  ntb_steder_id: objectId('400000000000000000000001'),
  dnt_user_id: 5678,
  comment: null,
}, {
  _id: objectId('200000000000000000000003'),
  timestamp: new Date('2016-07-07T20:33:49.923Z'),
  location: { type: 'Point', coordinates: [-117.220406, 32.719464] },
  public: false,
  ntb_steder_id: objectId('400000000000000000000000'),
  dnt_user_id: 1234,
  comment: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
}];
