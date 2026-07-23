import express from 'express';
import { appConfig, appDb, appRedis } from 'src/app';
import { logger } from './utils';

(async () => {
  const app = express();
  const appPort = appConfig.env.port;

  // Middleware
  app.use(express.json());

  // Redis storage initialize
  appRedis.initialize();

  // Redis queue initialize
  appRedis.initialize('queue');

  // Database initialize
  await appDb.initialize();

  app.listen(appPort, () => {
    logger.info(`Server running at port: ${appPort}`);
  });
})().catch((error) => {
  logger.error(`Failed to start server: ${error.message}`);
});
