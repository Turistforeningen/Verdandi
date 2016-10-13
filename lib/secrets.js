'use strict';

const fs = require('fs');
const path = require('path');

function getFromJson() {
  let secrets;
  const variables = [
    'NTB_API_KEY',
    'NEW_RELIC_LICENSE_KEY',
    'SENTRY_DSN',
  ];

  try {
    secrets = JSON.parse(fs.readFileSync(
      path.resolve(__dirname, '../secrets/prod.json'),
      { encoding: 'utf-8' }
    ));
  } catch (err) {
    throw new Error('Could not read secrets file "prod.json"');
  }

  variables.forEach(key => {
    if (typeof secrets[key] === 'undefined') {
      throw new Error(`Environment variable "${key}" is missing`);
    }
  });

  return secrets;
}

function getFromProcess() {
  const variables = [
    'NTB_API_KEY',
    'OAUTH_CLIENT_ID',
    'OAUTH_CLIENT_SECRET',
    'OAUTH_ACCESS_TOKEN',
    'OAUTH_REFRESH_TOKEN',
    'OAUTH_USER_ID',
  ];

  return variables.reduce((object, key) => {
    const value = process.env[key];
    if (typeof value === 'undefined') {
      throw new Error(`Environment variable "${key}" is missing`);
    } else {
      object[key] = value;
      return object;
    }
  }, {});
}

const env = process.env.NODE_ENV;
let secrets;

switch (env) {
  case 'development':
    secrets = getFromProcess();
    break;
  case 'test':
    secrets = getFromProcess();
    break;
  case 'production':
    secrets = getFromJson();
    break;
  default:
    throw new Error('Environment variable "NODE_ENV" is undefined or invalid');
}

module.exports = secrets;
