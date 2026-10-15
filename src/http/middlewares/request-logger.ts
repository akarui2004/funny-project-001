import { NextFunction, Request, Response } from 'express';
import { createModuleLogger } from 'src/utils';

const logger = createModuleLogger('http');

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const { method, originalUrl, ip } = req

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    logger.info(`${method} ${originalUrl} ${statusCode} - ${duration}ms`, {
      method,
      url: originalUrl,
      status: statusCode,
      durationMs: duration,
      ip,
    })
  });

  next();
}