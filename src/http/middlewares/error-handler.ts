import { NextFunction, Request, Response } from 'express';
import { createModuleLogger, getErrorMessage } from 'src/utils';
import { ZodError } from 'zod';
import { HttpError } from '../errors/http-error';

const logger = createModuleLogger('http');

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  // 1. Http Error
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

  // 2. Zod Validator
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

  // 3. Malformed JSON error
  if (err instanceof SyntaxError && 'status' in err && (err as { status?: unknown }).status === 400 && 'body' in err) {
    res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Malformed JSON payload in request body',
      },
    });
    return;
  }

  // Unknown error
  logger.error(`[Unhandled Server Error] ${req.method} ${req.originalUrl}: ${getErrorMessage(err)}`, { err });

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal Server Error',
    }
  });
}
