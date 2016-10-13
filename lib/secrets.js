'use strict';

const fs = require('fs');
const path = require('path');

function getFromJson() {
  try {
    const secrets = fs.readFileSync(
      path.resolve(__dirname, '../secrets/prod.json'),
      { encoding: 'utf-8' }
    );
    return JSON.parse(secrets);
  } catch (err) {
    throw new Error('Could not read secrets file "prod.json"');
  }
}

function getFromProcess() {
  const variables = ['NTB_API_KEY'];

  return variables.reduce((object, current) => {
    object[current] = process.env[current];
    return object;
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
