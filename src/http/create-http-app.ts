import cors from 'cors';
import express, { Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import type { THttpSchema } from 'src/app/config-loader/config.type';
import { createModuleLogger } from 'src/utils';
import { HttpError } from './errors/http-error';
import { errorHandler, notFoundHandler, requestLogger } from './middlewares';
import { createHealthRouter, type ReadinessChecks } from './routes';

export interface HttpAppDependencies {
  readiness: ReadinessChecks;
}

const logger = createModuleLogger('http');

/**
 * Builds the Express app without listening, so tests can drive it directly.
 * Middleware order is fixed: security -> parsing -> logging -> routes -> 404 -> errors.
 * Health and the api/ops/manager surfaces mount between the logger and the 404 handler.
 */
export function createHttpApp(http: THttpSchema, deps: HttpAppDependencies): Express {
  const app = express();

  // Which proxy hops may set X-Forwarded-For; see docs/setup/configuration.md ([http] trustProxy)
  if (http.trustProxy === true) {
    logger.warn('http.trustProxy = true trusts every hop: clients can spoof their IP. Use a hop count or proxy CIDRs.');
  }
  app.set('trust proxy', http.trustProxy);

  app.use(helmet());

  // Empty origins = deny every cross-origin request
  app.use(cors({ origin: http.cors.origins.length === 0 ? false : http.cors.origins }));

  app.use(rateLimit({
    windowMs: http.rateLimit.windowMs,
    limit: http.rateLimit.limit,
    standardHeaders: true,
    legacyHeaders: false,
    // Forward to the central error handler so the 429 body matches every other error
    handler: (_req, _res, next) => next(HttpError.tooManyRequest('Rate limit exceeded, please try again later.')),
  }));

  app.use(express.json({ limit: http.jsonLimit }));
  app.use(requestLogger);

  // Health route
  app.use(createHealthRouter(deps.readiness));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
