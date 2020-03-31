'use strict';

process.env.MONGO_URI='mongodb://localhost:27017/test';

process.env.NTB_API_KEY = 'fake';

process.env.API_URL_PREFIX = 'dev';

process.env.API_CLIENT_TOKENS = 'client123,client456';

process.env.CHECKIN_MAX_DISTANCE = 200;
process.env.CHECKIN_TIMEOUT = 86400;
process.env.AWS_BUCKET_PATH = 'test/';
