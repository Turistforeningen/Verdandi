'use strict';

/* istanbul ignore if  */
if (process.env.NODE_ENV === 'production') {
  /* eslint-disable no-console */
  console.log('Starting newrelic application monitoring');
  /* eslint-enable */
  require('newrelic'); // eslint-disable-line global-require
}

const raven = require('raven');
const sentry = require('./lib/sentry');
const r = require('./lib/rethink');

const express = require('express');
const compression = require('compression');
const responseTime = require('response-time');
const bodyParser = require('body-parser');
const HttpError = require('@starefossen/http-error');

const app = module.exports = express();
const router = new express.Router();

app.set('json spaces', 2);
app.set('x-powered-by', false);
app.set('etag', false);

router.use(compression());
router.use(responseTime());
router.use(bodyParser.json());

// Full URL
const fullUrl = require('./lib/express-full-url');
router.use(fullUrl);

// Cors Headers
const corsHeaders = require('@starefossen/express-cors');
router.use(corsHeaders.middleware);

// Health Check
const healthCheck = require('@starefossen/express-health');
router.get('/CloudHealthCheck', healthCheck({
  name: 'RethinkDB',
  check: cb => {
    cb(null, { status: 'Ok' });
  },
}));

router.get('/', (req, res) => {
  res.json({
    albums_url: `${req.fullUrl}/albums`,
    photos_url: `${req.fullUrl}/albums/{album}/photos`,
  });
});

router.use((req, res, next) => {
  if (!req.headers['x-user-id']) {
    next(new HttpError('X-User-Id header is required'), 401);
  } else {
    req.user = { id: parseInt(req.headers['x-user-id'], 10) };
    next();
  }
});

const notImplementedYet = (req, res) => {
  res.status(418);
  res.json({ message: 'Not implemented yet, come back later' });
};

router.get('/steder/:sted/stats', notImplementedYet);
router.get('/steder/:sted/logg', notImplementedYet);

router.post('/steder/:sted/besok', (req, res, next) => {
  r.r.table('checkins').insert({
    timestamp: new Date(),
    location: r.r.point(req.body.lon, req.body.lat),
    ntb_steder_id: req.params.sted,
    dnt_user_id: req.user.id,
  }, { returnChanges: true }).run(r.c, (err, data) => {
    if (err) {
      if (err.name === 'ReqlQueryLogicError') {
        next(new HttpError(err.msg, 400, err));
      } else {
        next(new HttpError('Database connection failed', 500, err));
      }
    } else {
      const id = data.generated_keys[0];

      res.set('Location', `${req.fullUrl}${req.url}/${id}`);
      res.json({ message: 'Ok', data: data.changes[0].new_val });
    }
  });
});

router.post('/steder/:sted/besok/:checkin', notImplementedYet);

router.get('/lister/:liste/stats', notImplementedYet);
router.get('/lister/:liste/logg', notImplementedYet);
router.post('/lister/:liste/blimed', notImplementedYet);

router.get('/brukere/:bruker/stats', notImplementedYet);
router.get('/brukere/:bruker/logg', notImplementedYet);

// Not Found
router.use((req, res, next) => next(new HttpError('Not Found', 404)));

// Sentry Error Handling
router.use(raven.middleware.express.requestHandler(sentry));
router.use(raven.middleware.express.errorHandler(sentry));

// Final Error Handling
router.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  /* eslint-disable no-console */
  if (err.code >= 500) {
    if (err.error) {
      console.error(err.error.message);
      console.error(err.error.stack);
    } else {
      console.error(err.message);
      console.error(err.stack);
    }
  }
  /* eslint-enable */

  res.status(err.code).json(err.toJSON());
});

app.use(process.env.VIRTUAL_PATH, router);

/* istanbul ignore if */
if (!module.parent) {
  const port = process.env.VIRTUAL_PORT || 8080;

  app.listen(port);
  console.log(`Server listening on port ${port}`); // eslint-disable-line no-console
}
