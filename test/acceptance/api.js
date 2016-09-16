/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
'use strict';

const assert = require('assert');
const request = require('supertest');
const app = request(require('../../index'));

describe('GET /', () => {
  const url = '/api/dev/';

  it('returns API index', () => (
    app.get(url)
      .expect(200)
      .expect(res => {
        assert.equal(typeof res.body.checkin_new.rules, 'object');
        assert.equal(typeof res.body.checkin_new.rules.max_distance, 'number');
        assert.equal(typeof res.body.checkin_new.rules.timeout, 'number');
        Object.keys(res.body).forEach(key => {
          assert.equal(typeof res.body[key].url, 'string');
        });
      })
  ));
});
