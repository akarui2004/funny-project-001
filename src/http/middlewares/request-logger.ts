import { NextFunction, Request, Response } from 'express';
import { createModuleLogger } from 'src/utils';
import { getClientIp } from 'src/utils/get-client-ip';

const logger = createModuleLogger('http');

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const { method, originalUrl } = req;
  // Resolved up front: the socket and forwarded chain are what the request arrived with
  const { ip, socketIp, forwardedChain } = getClientIp(req);

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    logger.info(`${method} ${originalUrl} ${statusCode} - ${duration}ms`, {
      method,
      url: originalUrl,
      status: statusCode,
      durationMs: duration,
      ip,
      socketIp,
      forwardedChain,
    });
  });

  next();
}
