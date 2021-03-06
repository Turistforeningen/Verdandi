'use strict';

const secrets = require('./lib/secrets');

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
const MongoQS = require('mongo-querystring');

const { Types: { ObjectId: objectId } } = require('./lib/db');

const {
  middleware: auth,
  requireAuth,
  requireClient,
  requireUser,
  isClient,
} = require('./lib/auth');
const { middleware: getNtbObject } = require('./lib/ntb');
const { middleware: s3uploader } = require('./lib/upload');

const app = module.exports = express();
const router = new express.Router();

const API_URL_PREFIX = process.env.API_URL_PREFIX || 'v3';

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

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.locals.requestStart = start;
  if (process.env.TEST_RUNNER !== '1') {
    console.info(`${req.method} ${req.url} - Start request`);
  }

  const oldEnd = res.end;
  res.end = function () {
    const ms = Date.now() - res.locals.requestStart;
    oldEnd.apply(res, arguments)

    if (process.env.TEST_RUNNER !== '1') {
      console.info(`${req.method} ${req.url} ${res.statusCode} - ${ms}ms`);
    }
  }

  next();
});

// Health Check
const healthCheck = require('@starefossen/express-health');

router.use(auth);

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
    .then(user => { req.authUser = user; })

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

router.get('/steder/:sted/stats', (req, res, next) => {
  const qs = new MongoQS({ whitelist: { timestamp: true } });
  const where = Object.assign(
    qs.parse(req.query),
    { ntb_steder_id: req.params.sted }
  );

  Checkin.find()
    .where(where)
    .then(checkins => {
      const data = { count: checkins.length };
      data.brukere = checkins.reduce((acc, checkin) => (
        acc.includes(checkin.user) ? acc : acc.concat(checkin.user)
      ), []).length;
      data.private = checkins.filter(c => !c.public).length;
      data.public = data.count - data.private;

      res.json({ data });
    })
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
    .then(checkins => checkins.map(c => c.anonymize(req.headers['x-user-id'], isClient(req))))
    .then(data => res.json({ data }))
    .catch(error => next(new HttpError('Database failure', 500, error)));
});

router.get('/steder/:sted/brukere', requireClient, getNtbObject, (req, res, next) => {
  const qs = new MongoQS({ whitelist: { timestamp: true } });
  const where = Object.assign(
    qs.parse(req.query),
    { ntb_steder_id: req.params.sted }
  );

  Checkin.find()
    .where(where)
    .populate('user')
    .sort({ timestamp: -1 })
    .then(checkins => checkins.reduce((accumulated, item) => Object.assign(
      {},
      accumulated,
      {
        [item.user]: {
          _id: item.user._id,
          avatar: item.user.avatar,
          navn: item.user.navn,
          epost: item.user.epost,
          fodselsdato: item.user.fodselsdato || null,
          innsjekkinger: {
            logg: [
              ...(
                accumulated[item.user] && accumulated[item.user].innsjekkinger
                  ? accumulated[item.user].innsjekkinger.logg
                  : []
              ),
              {
                _id: item._id,
                ntb_steder_id: item.ntb_steder_id,
                public: item.public,
                timestamp: item.timestamp,
              },
            ],
          },
        },
      }
    ), {}))
    .then(obj => Object.keys(obj).map(item => obj[item]))
    .then(brukere => {
      const data = brukere.map(bruker => {
        bruker.innsjekkinger.private = bruker.innsjekkinger.logg
          .reduce((acc, item) => (
            acc + (item.public ? 0 : 1)
          ), 0);
        bruker.innsjekkinger.public =
          bruker.innsjekkinger.logg.length - bruker.innsjekkinger.private;
        return bruker;
      });

      res.json({
        ntb_steder_id: req.params.sted,
        brukere: data,
      });
    })
    .catch(error => next(new HttpError('Database failure', 500, error)));
});

// TODO(Håvard): May not need getNtbObject
router.post(
  '/steder/:sted/besok',
  requireUser,
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
        dnt_user_id: req.authUser._id,
        timestamp: req.body.timestamp,
        comment: req.body.comment || null,
        photo: photo ? photo._id : null,
      })
    ))
    .then(checkin => {
      c = checkin;
      req.authUser.innsjekkinger.push(checkin);
      return req.authUser.save();
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

router.get(['/besok/:checkin', '/steder/:sted/besok/:checkin'], (req, res, next) => {
  // @TODO redirect to correct cononical URL for checkin ID
  const promise = Checkin.findOne({ _id: req.params.checkin }).populate('user photo');

  promise
    .then(checkin => {
      if (!checkin) {
        return next(new HttpError('Checkin not found', 404));
      } else if (checkin.isReadAllowed(req) !== true) {
        return next(new HttpError('Checkin not public', 403));
      }
      return res.json({ data: checkin.anonymize(req.headers['x-user-id'], isClient(req)) });
    })
    .catch(error => next(new HttpError('Internal server error', 500, error)));

  promise.catch(error => next(new HttpError('Database failure', 500, error)));
});

router.put('/steder/:sted/besok/:checkin', requireAuth, multer.single('photo'), s3uploader, (req, res, next) => {
  const promise = Checkin.findOne({ _id: req.params.checkin }).exec();
  let c;

  promise.then(checkin => {
    if (checkin === null) {
      throw new HttpError('Checkin not found', 404);
    } else if (checkin.isWriteAllowed(req) !== true) {
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

router.delete('/steder/:sted/besok/:checkin', requireAuth, (req, res, next) => {
  const promise = Checkin.findOne({ _id: req.params.checkin }).exec();

  promise.then(checkin => {
    if (checkin === null) {
      throw new HttpError('Checkin not found', 404);
    } else if (checkin.isWriteAllowed(req) !== true) {
      throw new HttpError('Authorization failed', 403);
    }

    return checkin;
  })
  .then(checkin => Checkin.deleteOne({ _id: req.params.checkin }).exec())
  .then(result => {
    if (result.deletedCount === 1) {
      res.json();
    } else {
      next(new HttpError('Unknown error', 500));
    }
  })
  .catch(error => {
    if (error instanceof HttpError) {
      next(error);
    } else {
      next(new HttpError('Unknown error', 500, error));
    }
  });
});

router.get('/lister/:liste/stats', getNtbObject, (req, res, next) => {
  const steder = (req.ntbObject.steder || []).map(sted => objectId(sted));
  const qs = new MongoQS({ whitelist: { timestamp: true } });
  const where = Object.assign(
    qs.parse(req.query),
    { ntb_steder_id: { $in: steder } }
  );

  const checkinPromise = Checkin.find()
    .where(where)
    .populate('user')
    .then(checkinsData => {
      const filterUsers = req.query['only-signed-up-users'] === '1';
      const checkins = filterUsers
        ? checkinsData
            .filter(checkin => checkin.user.lister.includes(req.params.liste))
        : checkinsData;

      const data = { count: checkins.length };
      data.steder = checkins.reduce((acc, checkin) => Object.assign(acc, {
        [checkin.ntb_steder_id]: acc[checkin.ntb_steder_id]
          ? acc[checkin.ntb_steder_id] + 1
          : 1,
      }), {});
      data.brukere = checkins.reduce((acc, checkin) => (
        acc.includes(checkin.user) ? acc : acc.concat(checkin.user)
      ), []).length;
      data.private = checkins.filter(c => !c.public).length;
      data.public = data.count - data.private;

      return Promise.resolve(data);
    })
    .catch(err => Promise.reject(err));

  const userPromise = User.count()
    .where({ lister: req.ntbObject._id })
    .catch(err => Promise.reject(err));

  Promise.all([checkinPromise, userPromise])
    .then(data => {
      res.json({
        innsjekkinger: data[0],
        signedUp: data[1],
      });
    })
    .catch(error => next(new HttpError('Database failure', 500, error)));
});

router.get('/lister/:liste/brukere', requireClient, getNtbObject, (req, res, next) => {
  const steder = (req.ntbObject.steder || []).map(sted => objectId(sted));
  const qs = new MongoQS({ whitelist: { timestamp: true } });
  const where = Object.assign(
    qs.parse(req.query),
    { ntb_steder_id: { $in: steder } }
  );

  Checkin.find()
    .where(where)
    .populate('user')
    .sort({ timestamp: -1 })
    .then(checkinsData => {
      const filterUsers = req.query['only-signed-up-users'] === '1';
      const checkins = filterUsers
        ? checkinsData
            .filter(checkin => checkin.user.lister.includes(req.params.liste))
        : checkinsData;

      return checkins.reduce((accumulated, item) => Object.assign(
        {},
        accumulated,
        {
          [item.user]: {
            _id: item.user._id,
            avatar: item.user.avatar,
            navn: item.user.navn,
            epost: item.user.epost,
            fodselsdato: item.user.fodselsdato || null,
            innsjekkinger: {
              logg: [
                ...(
                  accumulated[item.user] && accumulated[item.user].innsjekkinger
                    ? accumulated[item.user].innsjekkinger.logg
                    : []
                ),
                {
                  _id: item._id,
                  ntb_steder_id: item.ntb_steder_id,
                  public: item.public,
                  timestamp: item.timestamp,
                },
              ],
            },
          },
        }
      ), {});
    })
    .then(obj => Object.keys(obj).map(item => obj[item]))
    .then(brukere => {
      const data = brukere.map(bruker => {
        bruker.innsjekkinger.steder = bruker.innsjekkinger.logg
          .reduce((acc, item) => {
            acc[item.ntb_steder_id] = acc[item.ntb_steder_id]
              ? acc[item.ntb_steder_id] + 1
              : 1;
            return acc;
          }, {});
        bruker.innsjekkinger.private = bruker.innsjekkinger.logg
          .reduce((acc, item) => (
            acc + (item.public ? 0 : 1)
          ), 0);
        bruker.innsjekkinger.public =
          bruker.innsjekkinger.logg.length - bruker.innsjekkinger.private;
        return bruker;
      });

      res.json({
        steder: req.ntbObject.steder,
        brukere: data,
      });
    })
    .catch(error => next(new HttpError('Database failure', 500, error)));
});

router.get('/lister/:liste/logg', getNtbObject, (req, res, next) => {
  const steder = (req.ntbObject.steder || []).map(sted => objectId(sted));
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

router.post('/lister/:liste/blimed', requireUser, (req, res, next) => {
  const user = req.authUser;
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
  const user = req.authUser;
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
  res.json({ data: req.authUser });
});

router.post('/brukere/:bruker/bytt-id', requireClient, (req, res) => { // eslint-disable-line consistent-return
  const oldUserId = Number(req.params.bruker);
  const newUserId = req.body._id;

  if (typeof newUserId !== 'number') {
    return res.status(400).json({
      errors: { _id: ['Invalid user ID. Must be a number'] },
    });
  }

  let newUser;
  let oldUser;

  // Set new user ID to all checkins
  Checkin.update(
    { user: oldUserId },
    { user: newUserId, dnt_user_id: newUserId },
    { multi: true }
  )
    .then(checkins => (
      // Find both old and new (if existing) user
      Promise.all([
        User.findOne({ _id: oldUserId }),
        User.findOne({ _id: newUserId }),
      ])
    ))
    .then(users => {
      [oldUser, newUser] = users;

      // If new user, merge lister and innsjekkinger
      if (newUser) {
        return newUser.update({
          lister: [
            ...(oldUser.get('lister') || []),
            ...(newUser.get('lister') || []).filter(id => (
              // Avoid duplicates
              oldUser.get('lister').indexOf(id) === -1
            )),
          ],
          innsjekkinger: [
            ...(oldUser.get('innsjekkinger') || []),
            ...(newUser.get('innsjekkinger') || []).filter(id => (
              // Avoid duplicates
              (oldUser.get('innsjekkinger') || []).indexOf(id) === -1
            )),
          ],
        });
      }

      // If no user was created for the new ID, create new user with data
      return User.create(Object.assign(oldUser.toJSON(), { _id: newUserId }));
    })
    .then(user => (
      // Delete old user
      User.deleteOne({ _id: oldUserId })
    ))
    .then(user => (
      res.json({ _id: newUserId })
    ));
});

router.get('/brukere/:bruker/stats', requireClient, (req, res, next) => {
  const qs = new MongoQS({ whitelist: { timestamp: true } });
  const where = Object.assign(
    qs.parse(req.query),
    { user: req.authUser._id }
  );

  Checkin.find()
    .where(where)
    .then(checkins => {
      const data = { count: checkins.length };
      data.steder = checkins.reduce((acc, checkin) => Object.assign(acc, {
        [checkin.ntb_steder_id]: acc[checkin.ntb_steder_id]
          ? acc[checkin.ntb_steder_id] + 1
          : 1,
      }), {});
      data.private = checkins.filter(c => !c.public).length;
      data.public = data.count - data.private;

      res.json({
        lister: req.authUser.lister,
        innsjekkinger: data,
        bruker: req.authUser._id,
      });
    })
    .catch(err => Promise.reject(err));
});

router.get('/brukere/:bruker/logg', (req, res, next) => {
  const qs = new MongoQS({ whitelist: { timestamp: true } });
  const where = Object.assign(
    qs.parse(req.query),
    { user: req.authUser._id }
  );

  Checkin.find()
    .where(where)
    .populate('photo')
    .then(checkins => {
      const logg = isClient(req) ? checkins : checkins.filter(c => c.public);
      let steder = logg
        .map(checkin => checkin.ntb_steder_id);
      steder = steder
        .filter((sted, pos) => steder.indexOf(sted) === pos);
      res.json({
        steder,
        logg,
      });
    })
    .catch(err => Promise.reject(err));
});

// Not Found
router.use((req, res, next) => next(new HttpError('Not Found', 404)));

// Final Error Handling
router.use((err, req, res, next) => {
  if (err.code >= 500) {
    if (err.error) {
      console.error(err.error.message);
      console.error(err.error.stack);
    } else {
      console.error(err.message);
      console.error(err.stack);
    }
  } else if (err.message && err.stack) {
    console.error(err.message);
    console.error(err.stack);
  }

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

app.use(`/api/${API_URL_PREFIX}`, router);

// Redirect til admin
const adminRouter = new express.Router();
adminRouter.get('/*', (req, res, next) => {
  res.redirect(301, 'https://sjekkut-admin.app.dnt.no' + req.path)
});
app.use('/', adminRouter);

/* istanbul ignore if */
if (!module.parent) {
  const port = process.env.PORT || 6078;

  app.listen(port);
  console.log(`Server listening on port ${port}`);
}
