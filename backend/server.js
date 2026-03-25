'use strict';

const connectDB = require('./src/config/db');
const env = require('./src/config/env');
const app = require('./src/app');

(async () => {
  await connectDB();

  const port = Number(env.PORT) || 3001;
  app.listen(port, () => {
    console.log(`WeddHelp backend running on http://localhost:${port}`);
    console.log(`Environment: ${env.NODE_ENV}`);
  });
})();
