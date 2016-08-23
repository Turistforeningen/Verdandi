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

const User = require('./models/User');
const Checkin = require('./models/Checkin');

const express = require('express');
const compression = require('compression');
const responseTime = require('response-time');
const bodyParser = require('body-parser');
const HttpError = require('@starefossen/http-error');

const app = module.exports = express();
const router = new express.Router();

app.set('json spaces', 2);
app.set('x-powered-by', false);

router.use(compression());
router.use(responseTime());
router.use(bodyParser.json());

// Full URL
router.use(require('./lib/express-full-url'));

// Cors Headers
router.use(require('@starefossen/express-cors').middleware);

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
    checkin_new: `${req.fullUrl}/steder/{sted}/besok`,
    checkin_get: `${req.fullUrl}/steder/{sted}/besok/{oid}`,
    checkin_log: `${req.fullUrl}/steder/{sted}/logg`,
    checkin_stats: `${req.fullUrl}/steder/{sted}/stats`,
    profile_view: `${req.fullUrl}/brukere/{bruker}`,
  });
});

const requireAuth = (req, res, next) => {
  if (!req.headers['x-user-id']) {
    next(new HttpError('X-User-Id header is required', 401));
  } else {
    req.user = { id: parseInt(req.headers['x-user-id'], 10) };
    next();
  }
};

const notImplementedYet = (req, res) => {
  res.status(418);
  res.json({ message: 'Not implemented yet, come back later' });
};

router.param('checkin', (req, res, next) => {
  // @TODO validate sted _id

  next();
});

router.get('/steder/:sted/stats', (req, res, next) => {
  Checkin
    .find({ ntb_steder_id: req.params.sted })
    .count()
    .then(count => res.json({ data: { count } }))
    .catch(error => next(new HttpError('Database failure', 500, error)));
});

router.get('/steder/:sted/logg', (req, res, next) => {
  Checkin
    .find({ ntb_steder_id: req.params.sted })
    .limit(50)
    .sort({ timestamp: -1 })
    .exec()
    .then(data => res.json({ data }))
    .catch(error => next(new HttpError('Database failure', 500, error)));
});

router.post('/steder/:sted/besok', requireAuth, (req, res, next) => {
  const checkin = new Checkin({
    timestamp: new Date(),
    location: {
      type: 'Point',
      coordinates: [req.body.lon, req.body.lat],
    },
    ntb_steder_id: req.params.sted,
    dnt_user_id: req.user.id,
  });

  const promise = checkin.save();

  // @TODO add checkin to user profile

  promise.then(() => {
    res.set('Location', `${req.fullUrl}${req.url}/${checkin._id}`);
    res.json({
      message: 'Ok',
      data: checkin.toJSON({
        getters: false,
        virtuals: false,
        versionKey: false,
      }),
    });
  });

  promise.catch(error => {
    // @TODO better error message exists in error.errors

    if (error.name === 'ValidationError') {
      next(new HttpError(error.message, 400, error));
    } else {
      next(new HttpError('Database connection failed', 500, error));
    }
  });
});

router.param('checkin', (req, res, next) => {
  // @TODO validate checkin _id

  next();
});

router.get('/steder/:sted/besok/:checkin', (req, res, next) => {
  // @TODO redirect to correct cononical URL for checkin ID

  const promise = Checkin.findOne({ _id: req.params.checkin });

  promise.then(data => {
    if (!data) {
      next(new HttpError('Checkin not found', 404));
    } else {
      res.json({ data });
    }
  });

  promise.catch(error => next(new HttpError('Database failure', 500, error)));
});

router.get('/lister/:liste/stats', notImplementedYet);
router.get('/lister/:liste/logg', notImplementedYet);
router.post('/lister/:liste/blimed', notImplementedYet);

router.param('bruker', (req, res, next, bruker) => {
  const brukerId = parseInt(bruker, 10);

  // Assert valid user ID
  if (isNaN(brukerId)) {
    return next(new HttpError(`Invalid user id "${bruker}"`, 400));
  }

  // Get user profile from database
  return User
    .findOne({ _id: brukerId })
    .populate('innsjekkinger')
    .then(user => { req.user = user; next(); })
    .catch(error => next(new HttpError('Database failure', 500, error)));
});

router.get('/brukere/:bruker', (req, res, next) => {
  if (!req.user) {
    return next(new HttpError(`User "${req.params.bruker}" Not Found`, 404));
  }

  return res.json({ data: req.user });
});

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
