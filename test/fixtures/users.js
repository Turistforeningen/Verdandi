'use strict';

const objectId = require('mongoose').Types.ObjectId;

module.exports = [{
  _id: 1234,
  navn: 'Ole Olsen',
  epost: 'ole.olsen@example.com',
  avatar: 'https://www.gravatar.com/avatar/295c199022112b733b3dab46f52c83f8',
  lister: [
    objectId('300000000000000000000000'),
    objectId('300000000000000000000001'),
  ],
  innsjekkinger: [
    objectId('200000000000000000000000'),
    objectId('200000000000000000000001'),
  ],
}, {
  _id: 5678,
  navn: 'Per Pettersen',
  epost: 'per.pettersen@example.com',
  avatar: null,
  lister: [],
  innsjekkinger: [
    objectId('200000000000000000000002'),
  ],
}];
