'use strict';

const secrets = require('./lib/secrets'); // eslint-disable-line global-require

/* istanbul ignore if  */
if (process.env.NODE_ENV === 'production') {
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
const Photo = require('./models/Photo');

const express = require('express');
const tmpdir = require('os').tmpdir;
const uuid = require('uuid');
const extname = require('path').extname;
const diskStorage = require('multer').diskStorage;
const multer = require('multer')({
  storage: diskStorage({
    destination: tmpdir(),
    filename: function multerFilenameCb(req, file, cb) {
      const ext = extname(file.originalname).substr(1).toLowerCase() || 'jpg';
      return cb(null, `${uuid.v4()}.${ext}`);
    },
  }),
});
const compression = require('compression');
const responseTime = require('response-time');
const bodyParser = require('body-parser');
const HttpError = require('@starefossen/http-error');

const { Types: { ObjectId: objectId } } = require('./lib/db');

const { middleware: requireAuth } = require('./lib/auth');
const { middleware: getNtbObject } = require('./lib/ntb');
const { middleware: s3uploader } = require('./lib/upload');

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

// Params
router.param('checkin', (req, res, next) => {
  if (/^[a-f0-9]{24}$/.test(req.params.checkin) === false) {
    res.status(400).json({ code: 400, message: 'Invalid ObjectId' });
  } else {
    next();
  }
});

router.param('sted', (req, res, next) => {
  if (/^[a-f0-9]{24}$/.test(req.params.sted) === false) {
    res.status(400).json({ code: 400, message: 'Invalid ObjectId' });
  } else {
    next();
  }
});

router.param('liste', (req, res, next) => {
  if (/^[a-f0-9]{24}$/.test(req.params.liste) === false) {
    res.status(400).json({ code: 400, message: 'Invalid ObjectId' });
  } else {
    next();
  }
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

// API
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
  const where = {
    ntb_steder_id: req.params.sted,
  };

  switch (req.query.public) {
    case 'true':
      where.public = true;
      break;
    case 'false':
      where.public = false;
      break;
    default:
      break;
  }

  Checkin.find()
    .where(where)
    .populate('photo user')
    .sort({ timestamp: -1 })
    .then(checkins => checkins.map(c => c.anonymize(req.headers['x-user-id'])))
    .then(data => res.json({ data }))
    .catch(error => next(new HttpError('Database failure', 500, error)));
});

router.post(
  '/steder/:sted/besok',
  requireAuth,
  getNtbObject,
  multer.single('photo'),
  s3uploader,
  (req, res, next) => {
    let c;
    const promise = new Promise((resolve, reject) => {
      if (req.upload) {
        resolve(Photo.create({
          versions: req.upload
            .filter(upload => (!upload.original))
            .map(photo => ({
              url: photo.url,
              width: photo.width,
              height: photo.height,
              etag: photo.etag,
            })),
        }));
      } else {
        resolve();
      }
    })
    .then(photo => (
      Checkin.create({
        location: {
          type: 'Point',
          coordinates: [req.body.lon, req.body.lat],
        },
        public: !!req.body.public,
        ntb_steder_id: req.params.sted,
        dnt_user_id: req.user.id,
        timestamp: req.body.timestamp,
        comment: req.body.comment || null,
        photo: photo ? photo._id : null,
      })
    ))
    .then(checkin => {
      c = checkin;
      req.user.innsjekkinger.push(checkin);
      return req.user.save();
    })
    .then(user => c)
    .then(checkin => checkin.populate('photo user').execPopulate())
    .then(checkin => {
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
        next(new HttpError('Unknown error', 500, error));
      }
    });
  }
);

router.get('/steder/:sted/besok/:checkin', (req, res, next) => {
  // @TODO redirect to correct cononical URL for checkin ID

  const promise = Checkin.findOne({ _id: req.params.checkin }).populate('user photo');

  promise.then(checkin => {
    if (!checkin) {
      return next(new HttpError('Checkin not found', 404));
    } else if (!checkin.public && (checkin.user._id !== Number(req.headers['x-user-id']))) {
      return next(new HttpError('Checkin not public', 403));
    } else {
      res.json({ data: checkin.anonymize(req.headers['x-user-id']) });
    }
  }).catch(error => next(new HttpError('Internal server error', 500, error)));

  promise.catch(error => next(new HttpError('Database failure', 500, error)));
});

router.put('/steder/:sted/besok/:checkin', requireAuth, multer.single('photo'), s3uploader, (req, res, next) => {
  const promise = Checkin.findOne({ _id: req.params.checkin }).exec();
  let c;

  promise.then(checkin => {
    if (checkin === null) {
      throw new HttpError('Checkin not found', 404);
    } else if (checkin.user !== req.user._id) {
      throw new HttpError('Authorization failed', 403);
    }
    c = checkin;
    return checkin;
  })
  .then(checkin => new Promise((resolve, reject) => {
    if (req.upload) {
      resolve(Photo.create({
        versions: req.upload
          .filter(upload => (!upload.original))
          .map(photo => ({
            url: photo.url,
            width: photo.width,
            height: photo.height,
            etag: photo.etag,
          })),
      }));
    } else {
      resolve();
    }
  }))
  .then(photo => (
    Checkin.findOneAndUpdate(
      { _id: req.params.checkin },
      {
        public: photo ? c.public : !!req.body.public,
        comment: photo ? c.comment : req.body.comment || null,
        photo: photo ? photo._id : req.body.photo || null,
      },
      {
        new: true,
        runValidators: true,
        context: 'query',
      }
    )
  ))
  .then(data => data.populate('photo user').execPopulate())
  .then(data => {
    res.json({ data });
  })
  .catch(error => {
    if (error instanceof HttpError) {
      next(error);
    } else if (error.name === 'ValidationError') {
      res.status(400).json({
        message: 'Checkin validation failed',
        code: 400,
        errors: error.errors,
      });
    } else {
      next(new HttpError('Unknown error', 500, error));
    }
  });
});

router.get('/lister/:liste/stats', notImplementedYet);

router.get('/lister/:liste/logg', getNtbObject, (req, res, next) => {
  const steder = req.ntbObject.steder.map(sted => objectId(sted)) || [];
  const where = { ntb_steder_id: { $in: steder } };

  switch (req.query.public) {
    case 'true':
      where.public = true;
      break;
    case 'false':
      where.public = false;
      break;
    default:
      break;
  }

  Checkin.find()
    .where(where)
    .populate('photo user')
    .sort({ timestamp: -1 })
    .then(checkins => checkins.map(c => c.anonymize(req.headers['x-user-id'])))
    .then(data => res.json({ data }))
    .catch(error => next(new HttpError('Database failure', 500, error)));
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

  if (err.code && (typeof err.toJSON === 'function')) {
    res.status(err.code).json(err.toJSON());
  } else if (err.status && err.message) {
    // Some errors, like SyntaxError from body-parser middleware
    // https://github.com/expressjs/body-parser/issues/122
    res.status(err.status).json({ code: err.status, message: err.message });
  } else {
    res.status(500).json({ code: 500, message: 'Unknown error' });
  }
});

app.use(process.env.VIRTUAL_PATH, router);

/* istanbul ignore if */
if (!module.parent) {
  const port = process.env.VIRTUAL_PORT || 8080;

  app.listen(port);
  console.log(`Server listening on port ${port}`); // eslint-disable-line no-console
}
