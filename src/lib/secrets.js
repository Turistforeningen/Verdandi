'use strict';

const fs = require('fs');

const variables = [
  { name: 'NTB_API_URL' },
  { name: 'NTB_API_KEY' },
  { name: 'MONGO_URI' },
  { name: 'AWS_ACCESS_KEY_ID' },
  { name: 'AWS_SECRET_ACCESS_KEY' },
  { name: 'API_CLIENT_TOKENS' },
  { name: 'OAUTH_ACCESS_TOKEN', env: ['development', 'test'] },
  { name: 'OAUTH_REFRESH_TOKEN', env: ['development', 'test'] },
  { name: 'OAUTH_USER_ID', env: ['development', 'test'] },
];

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

let secrets = getFromProcess();

variables
  .filter(
    variable => variable.env ? variable.env.find(
      env => (new RegExp(process.env.NODE_ENV).test(env))
    ) : true
  )
  .forEach(variable => {
    if (typeof secrets[variable.name] === 'undefined') {
      throw new Error(`Environvent variable ${variable.name} is missing`);
    }
  });

module.exports = secrets;
