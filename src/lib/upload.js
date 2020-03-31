'use strict';

const Upload = require('s3-uploader');

const secrets = require('./secrets');
const env = require('./env');

exports.client = new Upload(env.AWS_BUCKET_NAME, {
  cleanup: {
    original: true,
    versions: true,
  },
  url: env.AWS_BUCKET_URL,
  aws: {
    region: env.AWS_BUCKET_REGION,
    path: env.AWS_BUCKET_PATH,
    acl: 'public-read',
    accessKeyId: secrets.AWS_ACCESS_KEY_ID,
    secretAccessKey: secrets.AWS_SECRET_ACCESS_KEY,
    httpOptions: {
      timeout: 60000,
    },
  },
  versions: [
    {
      maxWidth: 960,
      format: 'jpg',
      suffix: '-large',
      quality: 80,
    },
    {
      maxWidth: 250,
      maxHeight: 250,
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
