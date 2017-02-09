'use strict';

const objectId = require('mongoose').Types.ObjectId;

module.exports = [
  {
    _id: objectId('400000000000000000000000'),
    versions: [
      {
        url: 'https://s3-eu-west-1.amazonaws.com/sjekkut/dev/3e9b1d32-5452-46ed-ae4e-99f3822b769f-large.jpg',
        height: 1040,
        width: 1040,
        etag: '"787b6d1f0d72ee1367a490924eb67807"',
      },
      {
        url: 'https://s3-eu-west-1.amazonaws.com/sjekkut/dev/3e9b1d32-5452-46ed-ae4e-99f3822b769f-thumb.jpg',
        height: 250,
        width: 250,
        etag: '"1b9b1cf15a53703423b598af47d869c0"',
      },
    ],
  },
  {
    _id: objectId('400000000000000000000001'),
    versions: [
      {
        url: 'https://s3-eu-west-1.amazonaws.com/sjekkut/dev/3e9b1d32-5452-46ed-ae4e-99f3822b769f-large.jpg',
        height: 1040,
        width: 1040,
        etag: '"787b6d1f0d72ee1367a490924eb67807"',
      },
      {
        url: 'https://s3-eu-west-1.amazonaws.com/sjekkut/dev/3e9b1d32-5452-46ed-ae4e-99f3822b769f-thumb.jpg',
        height: 250,
        width: 250,
        etag: '"1b9b1cf15a53703423b598af47d869c0"',
      },
    ],
  },
];
