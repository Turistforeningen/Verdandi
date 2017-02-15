'use strict';

const variables = [
  { name: 'AWS_BUCKET_NAME' },
  { name: 'AWS_BUCKET_PATH' },
  { name: 'AWS_BUCKET_REGION' },
  { name: 'AWS_BUCKET_URL' },
];

function getFromProcess() {
  return variables
    .reduce((object, variable) => {
      const value = process.env[variable.name];
      object[variable.name] = value;

      return object;
    }, {});
}

let environmentVariables;

switch (process.env.NODE_ENV) {
  case 'development':
  case 'test':
  case 'production':
    environmentVariables = getFromProcess();
    break;
  default:
    throw new Error('Environment variable "NODE_ENV" is undefined or invalid');
}

variables
  .filter(
    variable => variable.env ? variable.env.find( // eslint-disable-line no-confusing-arrow
      env => (new RegExp(process.env.NODE_ENV).test(env))
    ) : true
  )
  .forEach(variable => {
    if (typeof environmentVariables[variable.name] === 'undefined') {
      throw new Error(`Environvent variable ${variable.name} is missing`);
    }
  });

module.exports = environmentVariables;
