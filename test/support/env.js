'use strict';

delete process.env.MONGO_URI;
process.env.NODE_ENV = 'test';
process.env.MONGO_DB = 'test';
process.env.VIRTUAL_PATH = '/api/dev';

process.env.NTB_API_ENV = 'dev';
process.env.NTB_API_KEY = 'fake';

process.env.API_CLIENT_TOKENS = 'client123,client456';

process.env.CHECKIN_MAX_DISTANCE = 200;
process.env.CHECKIN_TIMEOUT = 86400;
process.env.AWS_BUCKET_PATH = 'test/';
