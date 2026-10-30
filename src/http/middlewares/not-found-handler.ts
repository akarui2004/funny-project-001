import { NextFunction, Request, Response } from 'express';
import { HttpError } from '../errors/http-error';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(HttpError.notFound(`Cannot ${req.method} ${req.originalUrl}`));
}
