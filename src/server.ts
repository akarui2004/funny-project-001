import express from 'express';
import { Server } from 'http';
import { appConfig, appDb, appRedis } from 'src/app';
import { NODE_ENV } from 'src/constants';
import { logger } from './utils';

let httpServer: Server | null = null;

// One line that says which environment and endpoints this process runs against (no secrets)
const logConfigSummary = () => {
  const { master: db } = appConfig.datasource;
  const { master: redis, queue } = appConfig.redis;
  logger.info(
    `NODE_ENV=${NODE_ENV} | config: ${appConfig.loadedFiles.join(' -> ')} | ` +
    `db: ${db.host}:${db.port}/${db.database} | ` +
    `redis: ${redis.host}:${redis.port}/${redis.db} | queue: ${queue.host}:${queue.port}/${queue.db}`
  );
};

// Startup order: connections first, HTTP last, so no request arrives before its dependencies are ready
const bootstrap = async () => {
  logConfigSummary();

  await appRedis.initialize('master');
  await appRedis.initialize('queue');
  await appDb.initialize('master');

  const app = express();
  app.use(express.json());

  const appPort = appConfig.env.port;
  httpServer = app.listen(appPort, () => {
    logger.info(`Server running at port: ${appPort}`);
  });
};

// Shutdown order is the reverse of startup: stop taking requests, then close connections
const shutdown = async (reason: string, exitCode: number) => {
  logger.info(`Shutting down (${reason})...`);
  try {
    if (httpServer) {
      await new Promise<void>((resolve) => httpServer!.close(() => resolve()));
    }
    await appDb.disconnectAll();
    await appRedis.disconnectAll();
  } catch (error: any) {
    logger.error(`Error during shutdown: ${error.message}`);
    exitCode = 1;
  }
  // Let the event loop drain instead of process.exit(), so pending log writes reach the file
  process.exitCode = exitCode;
};

process.once('SIGINT', () => void shutdown('SIGINT', 0));
process.once('SIGTERM', () => void shutdown('SIGTERM', 0));

bootstrap().catch((error) => {
  logger.error(`Failed to start server: ${error.message}`);
  // Close whatever did connect, otherwise open Redis sockets keep the process hanging
  void shutdown('startup failure', 1);
});
