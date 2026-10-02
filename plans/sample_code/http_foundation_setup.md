# Phase 1: HTTP Foundation, Middlewares, and App Factory

Tài liệu này tổng hợp các đoạn mã cốt lõi để xây dựng HTTP server với Express 5, tuân thủ nghiêm ngặt các quy chuẩn về xử lý lỗi (không lộ chi tiết 5xx), xác thực dữ liệu (Zod) và bảo mật (Helmet, CORS, Rate Limit, IP Allowlist).

## 1. Custom HTTP Error
**Đường dẫn:** `src/http/errors/http-error.ts`

```typescript
export class HttpError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;

    // Khôi phục prototype chain chính xác trong TypeScript
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static badRequest(message: string, code = 'BAD_REQUEST', details?: unknown): HttpError {
    return new HttpError(400, code, message, details);
  }

  static unauthenticated(message = 'Authentication required', code = 'UNAUTHENTICATED'): HttpError {
    return new HttpError(401, code, message);
  }

  static forbidden(message = 'Access denied', code = 'FORBIDDEN'): HttpError {
    return new HttpError(403, code, message);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND'): HttpError {
    return new HttpError(404, code, message);
  }

  static internal(message = 'Internal Server Error', code = 'INTERNAL_ERROR'): HttpError {
    return new HttpError(500, code, message);
  }

  static serviceUnavailable(message = 'Service unavailable', code = 'SERVICE_UNAVAILABLE', details?: unknown): HttpError {
    return new HttpError(503, code, message, details);
  }
}
```

## 2. Middlewares

### Request Logger
**Đường dẫn:** `src/http/middlewares/request-logger.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { createModuleLogger } from '../../utils/logger'; // Điều chỉnh path logger thực tế

const logger = createModuleLogger('http');

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    logger.info(`${method} ${originalUrl} ${statusCode} - ${duration}ms`, {
      method,
      url: originalUrl,
      status: statusCode,
      durationMs: duration,
      ip,
    });
  });

  next();
}
```

### Not Found Handler
**Đường dẫn:** `src/http/middlewares/not-found-handler.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../errors/http-error';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(HttpError.notFound(`Cannot ${req.method} ${req.originalUrl}`));
}
```

### Central Error Handler
**Đường dẫn:** `src/http/middlewares/error-handler.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../errors/http-error';
import { getErrorMessage } from '../../utils/get-error-message';
import { createModuleLogger } from '../../utils/logger';

const logger = createModuleLogger('http');

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 1. Lỗi HttpError chủ động throw
  if (err instanceof HttpError) {
    if (err.status >= 500) {
      logger.error(`[HttpError 5xx] ${req.method} ${req.originalUrl}: ${err.message}`, {
        err,
        code: err.code,
      });

      res.status(err.status).json({
        error: {
          code: err.code,
          message: 'Internal Server Error',
        },
      });
      return;
    }

    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined && { details: err.details }),
      },
    });
    return;
  }

  // 2. Lỗi Zod Validation
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'INVALID_INPUT',
        message: 'Validation failed',
        details: err.flatten(),
      },
    });
    return;
  }

  // 3. Lỗi Malformed JSON từ body-parser
  if (err instanceof SyntaxError && 'status' in err && (err as { status?: unknown }).status === 400 && 'body' in err) {
    res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Malformed JSON payload in request body',
      },
    });
    return;
  }

  // 4. Lỗi chưa dự đoán được (Unhandled / Server errors)
  logger.error(`[Unhandled Server Error] ${req.method} ${req.originalUrl}: ${getErrorMessage(err)}`, { err });

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal Server Error',
    },
  });
}
```

### Request Validator (Zod)
**Đường dẫn:** `src/http/middlewares/validate-request.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { HttpError } from '../errors/http-error';

export interface RequestValidationSchemas {
  body?: AnyZodObject;
  params?: AnyZodObject;
  query?: AnyZodObject;
}

export function validateRequest(schemas: RequestValidationSchemas) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      next();
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const isUuidError = schemas.params && error.issues.some(
          (issue) => issue.code === 'invalid_string' && issue.validation === 'uuid'
        );

        if (isUuidError) {
          next(new HttpError(400, 'INVALID_ID', 'Invalid UUID format in path parameters', error.flatten()));
          return;
        }

        next(new HttpError(400, 'INVALID_INPUT', 'Validation failed for request payload', error.flatten()));
        return;
      }
      next(error);
    }
  };
}
```

### IP Allowlist (net.BlockList)
**Đường dẫn:** `src/http/middlewares/ip-allow-list.ts`

```typescript
import { BlockList, isIP } from 'node:net';
import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../errors/http-error';

export function ipAllowList(allowedCidrs: string[]) {
  // Danh sách rỗng = cho phép tất cả IP (môi trường dev)
  if (!allowedCidrs || allowedCidrs.length === 0) {
    return (_req: Request, _res: Response, next: NextFunction): void => next();
  }

  const blockList = new BlockList();

  for (const cidr of allowedCidrs) {
    const trimmed = cidr.trim();
    if (!trimmed) continue;

    if (trimmed.includes('/')) {
      const [ip, prefixStr] = trimmed.split('/');
      const prefix = parseInt(prefixStr, 10);
      const ipType = isIP(ip);
      if (ipType === 4) blockList.addSubnet(ip, prefix, 'ipv4');
      else if (ipType === 6) blockList.addSubnet(ip, prefix, 'ipv6');
    } else {
      const ipType = isIP(trimmed);
      if (ipType === 4) blockList.addAddress(trimmed, 'ipv4');
      else if (ipType === 6) blockList.addAddress(trimmed, 'ipv6');
    }
  }

  return (req: Request, _res: Response, next: NextFunction): void => {
    let clientIp = req.ip || req.socket.remoteAddress || '';

    // Chuẩn hóa IPv4-mapped IPv6 address
    if (clientIp.startsWith('::ffff:')) {
      clientIp = clientIp.substring(7);
    }

    const family = isIP(clientIp);
    if (!family) {
      next(HttpError.forbidden('Forbidden: Unable to verify IP address'));
      return;
    }

    const type = family === 4 ? 'ipv4' : 'ipv6';
    const isAllowed = blockList.check(clientIp, type);

    if (!isAllowed) {
      next(HttpError.forbidden('Access denied from unauthorized IP address'));
      return;
    }

    next();
  };
}
```

## 3. App Factory
**Đường dẫn:** `src/http/create-http-app.ts`

```typescript
import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import { AppConfig } from '../app/config-loader';
import { requestLogger } from './middlewares/request-logger';
import { notFoundHandler } from './middlewares/not-found-handler';
import { errorHandler } from './middlewares/error-handler';
import { ipAllowList } from './middlewares/ip-allow-list';
import { authenticate } from './auth/authenticate';
import { createHealthRouter, ReadinessChecks } from './routes/health.route';
import { apiRouter } from './surfaces/api/api.router';
import { opsRouter } from './surfaces/ops/ops.router';
import { managerRouter } from './surfaces/manager/manager.router';
import { HttpError } from './errors/http-error';

export interface HttpAppDependencies {
  config: AppConfig;
  readinessChecks: ReadinessChecks;
}

export function createHttpApp({ config, readinessChecks }: HttpAppDependencies): Express {
  const app = express();

  // 1. Config Trust Proxy (Behind Nginx/Reverse Proxy)
  app.set('trust proxy', config.http.trustProxy);

  // 2. Helmet Security Headers
  app.use(helmet());

  // 3. CORS Configuration
  const corsOrigins = config.http.cors.origins;
  app.use(
    cors({
      origin: corsOrigins.length === 0 ? false : corsOrigins,
    })
  );

  // 4. Rate Limiting
  const limiter = rateLimit({
    windowMs: config.http.rateLimit.windowMs,
    limit: config.http.rateLimit.limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(new HttpError(429, 'TOO_MANY_REQUESTS', 'Rate limit exceeded, please try again later.'));
    },
  });
  app.use(limiter);

  // 5. Body Parser
  app.use(express.json({ limit: '100kb' }));

  // 6. Request Logger
  app.use(requestLogger);

  // 7. Health & Readiness Check Routes
  app.use(createHealthRouter(readinessChecks));

  // 8. Surfaces Wiring
  app.use(
    '/manager/v1',
    ipAllowList(config.http.manager.allowedCidrs),
    authenticate('manager'),
    managerRouter
  );

  app.use(
    '/ops/v1',
    authenticate('ops'),
    opsRouter
  );

  app.use(
    '/api/v1',
    authenticate('api'),
    apiRouter
  );

  // 9. Unmatched routes -> 404
  app.use(notFoundHandler);

  // 10. Central Error Handler
  app.use(errorHandler);

  return app;
}
```