import { NextFunction, Request, Response } from 'express';
import { z, ZodError } from 'zod';
import { HttpError } from '../errors/http-error';

export interface RequestValidationSchemas {
  body?: z.ZodObject,
  params?: z.ZodObject,
  query?: z.ZodObject,
}

export function validateRequest(schemas: RequestValidationSchemas) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.params) {
        const validatedParams = await schemas.params.parseAsync(req.params);
        Object.assign(req.params, validatedParams);
      }
      if (schemas.query) {
        const validatedQueries = await schemas.query.parseAsync(req.query);
        Object.assign(req.query, validatedQueries);
      }
      if (schemas.body) {
        const validatedBodies = await schemas.body.parseAsync(req.body);
        Object.assign(req.body, validatedBodies);
      }
      next();
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const isUuidError = Boolean(schemas.params) && error.issues.some(
          (issue) => issue.code === 'invalid_format' && issue.format === 'uuid'
        );

        if (isUuidError) {
          next(
            new HttpError(
              400,
              'Invalid UUID format in pathz parameter',
              { details: z.treeifyError(error) }
            )
          );
          return;
        }

        next(
          new HttpError(
            400,
            'Validation failed for request payload',
            { details: z.treeifyError(error) }
          )
        );
        return;
      }
      next(error);
    }
  }
}
