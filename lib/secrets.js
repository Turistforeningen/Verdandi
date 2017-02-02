'use strict';

const fs = require('fs');

const variables = [
  { name: 'NTB_API_KEY' },
  { name: 'NEW_RELIC_LICENSE_KEY', env: ['production'] },
  { name: 'SENTRY_DSN', env: ['production'] },
  { name: 'OAUTH_CLIENT_ID', env: ['development', 'test'] },
  { name: 'OAUTH_CLIENT_SECRET', env: ['development', 'test'] },
  { name: 'OAUTH_ACCESS_TOKEN', env: ['development', 'test'] },
  { name: 'OAUTH_REFRESH_TOKEN', env: ['development', 'test'] },
  { name: 'OAUTH_USER_ID', env: ['development', 'test'] },
  { name: 'AWS_ACCESS_KEY_ID' },
  { name: 'AWS_SECRET_ACCESS_KEY' }
];

function getFromJson() {
  try {
    return JSON.parse(fs.readFileSync('/secrets/prod.json', { encoding: 'utf-8' }));
  } catch (err) {
    throw new Error('Could not read secrets file "prod.json"');
  }
}

function getFromProcess() {
  return variables
    .filter( // eslint-disable-next-line
      variable => variable.env ? variable.env.find(env => /^development|test$/.test(env)) : true
    )
    .reduce((object, variable) => {
      const value = process.env[variable.name];
      object[variable.name] = value;

      return object;
    }, {});
}

const env = process.env.NODE_ENV;
let secrets;

switch (env) {
  case 'development':
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
