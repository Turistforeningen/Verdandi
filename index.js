'use strict';

/* istanbul ignore if  */
if (process.env.NODE_ENV === 'production') {
  const secrets = require('./lib/secrets'); // eslint-disable-line global-require

  process.env.NEW_RELIC_LICENSE_KEY = secrets.NEW_RELIC_LICENSE_KEY;
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

const { middleware: requireAuth } = require('./lib/auth');
const { middleware: getNtbObject } = require('./lib/ntb');

const app = module.exports = express();
const router = new express.Router();

app.set('json spaces', 2);
app.set('x-powered-by', false);
app.set('etag', 'strong');

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
    checkin_new: {
      url: `${req.fullUrl}/steder/{sted}/besok`,
      rules: {
        max_distance: parseInt(process.env.CHECKIN_MAX_DISTANCE, 10),
        quarantine: parseInt(process.env.CHECKIN_TIMEOUT, 10),
      },
    },
    checkin_get: { url: `${req.fullUrl}/steder/{sted}/besok/{oid}` },
    checkin_log: { url: `${req.fullUrl}/steder/{sted}/logg` },
    checkin_stats: { url: `${req.fullUrl}/steder/{sted}/stats` },
    profile_view: { url: `${req.fullUrl}/brukere/{bruker}` },
    list_join: { url: `${req.fullUrl}/lister/{liste}/blimed` },
    list_leave: { url: `${req.fullUrl}/lister/{liste}/meldav` },
    list_log: { url: `${req.fullUrl}/lister/{liste}/logg` },
  });
});

const notImplementedYet = (req, res) => {
  res.status(418);
  res.json({ message: 'Not implemented yet, come back later' });
};

router.get('/steder/:sted/stats', (req, res, next) => {
  Checkin.find()
    .where('ntb_steder_id').equals(req.params.sted)
    .count()
    .then(count => res.json({ data: { count } }))
    .catch(error => next(new HttpError('Database failure', 500, error)));
});

router.get('/steder/:sted/logg', (req, res, next) => {
  Checkin.find()
    .where('ntb_steder_id').equals(req.params.sted)
    .limit(50)
    .sort({ timestamp: -1 })
    .then(checkins => checkins.map(c => c.anonymize(req.headers['x-user-id'])))
    .then(data => res.json({ data }))
    .catch(error => next(new HttpError('Database failure', 500, error)));
});

router.post('/steder/:sted/besok', requireAuth, getNtbObject, (req, res, next) => {
  const promise = Checkin.create({
    location: {
      type: 'Point',
      coordinates: [req.body.lon, req.body.lat],
    },
    public: !!req.body.public,
    ntb_steder_id: req.params.sted,
    dnt_user_id: req.user.id,
    timestamp: req.body.timestamp,
    guestbook_entry: req.body.guestbook_entry || null,
  });

  // Save new checkin to user profile
  promise.then(checkin => {
    req.user.innsjekkinger.push(checkin);
    req.user.save();
  });

  // Return new checkin object
  promise.then(checkin => {
    res.set('Location', `${req.fullUrl}${req.url}/${checkin._id}`);
    res.json({
      message: 'Ok',
      data: checkin.toJSON({
        getters: false,
        versionKey: false,
      }),
    });
  });

  promise.catch(error => {
    if (error.name === 'ValidationError') {
      res.status(400).json({
        message: 'Checkin validation failed',
        code: 400,
        errors: error.errors,
      });
    } else {
      next(new HttpError('Database connection failed', 500, error));
    }
  });
});

router.param('checkin', (req, res, next) => {
  if (/^[a-f0-9]{24}$/.test(req.params.checkin) === false) {
    res.status(400).json({ message: 'Invalid ObjectId' });
  } else {
    next();
  }
});

router.get('/steder/:sted/besok/:checkin', (req, res, next) => {
  // @TODO redirect to correct cononical URL for checkin ID
  // @TODO validate visibility

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

router.put('/steder/:sted/besok/:checkin', requireAuth, (req, res, next) => {
  /**
    Some properties can not be changed, and are ignored:
    - location
    - ntb_steder_id
    - dnt_user_id
    - timestamp
  */

  const promise = Checkin.findOneAndUpdate(
    { _id: req.params.checkin },
    {
      public: true,
      guestbook_entry: req.body.guestbook_entry,
    },
    {
      new: true,
      runValidators: true,
      context: 'query',
    }
  );

  promise.then(data => {
    if (!data) {
      next(new HttpError('Checkin not found', 404));
    } else {
      res.json({ data });
    }
  });

  promise.catch(error => {
    if (error.name === 'ValidationError') {
      res.status(400).json({
        message: 'Checkin validation failed',
        code: 400,
        errors: error.errors,
      });
    } else {
      next(new HttpError('Database connection failed', 500, error));
    }
  });
});

router.get('/lister/:liste/stats', notImplementedYet);

router.get('/lister/:liste/logg', (req, res) => {
  Checkin.getCheckinsForList(req.params.liste)
    .then(checkins => checkins.map(c => c.anonymize(req.headers['x-user-id'])))
    .then(checkins => res.json({ data: checkins }));
});

router.post('/lister/:liste/blimed', requireAuth, (req, res) => {
  const user = req.user;
  if (user.lister.indexOf(req.params.liste) === -1) {
    user.lister.push(req.params.liste);
  }
  user.save();
  res.json({
    message: 'Ok',
    data: user,
  });
});

router.post('/lister/:liste/meldav', requireAuth, (req, res) => {
  const user = req.user;
  if (user.lister.indexOf(req.params.liste) > -1) {
    user.lister.splice(user.lister.indexOf(req.params.liste), 1);
  }
  user.save();
  res.json({
    message: 'Ok',
    data: user,
  });
});

router.param('bruker', (req, res, next, bruker) => {
  const brukerId = parseInt(bruker, 10);

  // Assert valid user ID
  if (isNaN(brukerId)) {
    return next(new HttpError(`Invalid user id "${bruker}"`, 400));
  }

  // Get user profile from database
  return User
    .findOne({ _id: brukerId })

    // Expand user checkins
    .populate('innsjekkinger')

    // Check if user exists
    .then(user => {
      if (!user) {
        throw new HttpError(`User "${req.params.bruker}" Not Found`, 404);
      }

      return user;
    })

    // Conditionally hide private user checkins
    // @TODO authenticate X-User-ID header before use
    .then(user => user.filterCheckins(parseInt(req.headers['x-user-id'], 10)))

    // Attach user instance to request object
    .then(user => { req.user = user; })

    .then(() => next())

    .catch(error => {
      if (error instanceof HttpError) {
        next(error);
      } else {
        next(new HttpError('Database failure', 500, error));
      }
    });
});

router.get('/brukere/:bruker', (req, res) => {
  res.json({ data: req.user });
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

app.use(`/api${process.env.VIRTUAL_PATH}`, router);
app.use(process.env.VIRTUAL_PATH, router);

/* istanbul ignore if */
if (!module.parent) {
  const port = process.env.VIRTUAL_PORT || 8080;

  app.listen(port);
  console.log(`Server listening on port ${port}`); // eslint-disable-line no-console
}
