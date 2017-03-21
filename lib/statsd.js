'use strict';

const StatsD = require('node-statsd');

module.exports = new StatsD({
  host: process.env.STATSD_HOST || 'localhost',
  port: process.env.STATSD_PORT || 8125,
  prefix: 'verdandi.',
});

module.exports.logRequest = function statsdLogRequest(time) {
  module.exports.increment('http.request.count');
  module.exports.gauge('http.request.time', time);
};
