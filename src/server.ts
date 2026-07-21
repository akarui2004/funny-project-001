import express from 'express';
import { config } from 'src/app';
import { logger } from './utils';

(async () => {
  const app = express();
  const appPort = config.env.port;

  // Middleware
  app.use(express.json());

  app.listen(appPort, () => {
    logger.info(`Server running at port: ${appPort}`);
  });
})().catch((error) => {
  logger.error(`Failed to start server: ${error.message}`);
});
