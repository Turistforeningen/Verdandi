'use strict';

const Upload = require('s3-uploader');

const secrets = require('./secrets'); // eslint-disable-line global-require

exports.client = new Upload(process.env.AWS_BUCKET_NAME, {
  cleanup: {
    original: true,
    versions: true,
  },
  url: process.env.AWS_BUCKET_URL,
  aws: {
    region: process.env.AWS_BUCKET_REGION,
    path: process.env.AWS_BUCKET_PATH,
    acl: 'public-read',
    accessKeyId: secrets.AWS_ACCESS_KEY_ID,
    secretAccessKey: secrets.AWS_SECRET_ACCESS_KEY,
    httpOptions: {
      timeout: 60000,
    },
  },
  versions: [
    {
      maxHeight: 1040,
      maxWidth: 1040,
      format: 'jpg',
      suffix: '-large',
      quality: 80,
    },
    {
      maxHeight: 250,
      maxWidth: 250,
      aspect: '1:1',
      suffix: '-thumb',
    },
  ],
  original: {
    awsImageAcl: 'private',
  },
});

exports.middleware = (req, res, next) => {
  if (req.file) {
    try {
      exports.client.upload(req.file.path, {}, (err, versions, meta) => {
        if (err) {
          next(err);
        }
        req.upload = versions;
        next();
      });
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
};
