'use strict';

const Client = require('raven').Client;
const secrets = require('./secrets');

module.exports = new Client(secrets.SENTRY_DSN);

/* istanbul ignore if */
if (secrets.SENTRY_DSN) {
  module.exports.patchGlobal((id, err) => {
    /* eslint-disable no-console */
    console.error('Uncaught Exception');
    console.error(err.message);
    console.error(err.stack);
    /* eslint-enable */
    process.exit(1);
  });
}
