import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { HTTP_ERRORS, HttpError } from '../errors/http-error';

export interface RequestValidationSchemas {
  params?: z.ZodType;
  body?: z.ZodType;
  query?: z.ZodType;
}

type ValidationSource = keyof RequestValidationSchemas;

interface ValidationFailure {
  source: ValidationSource;
  error: z.ZodError;
}

export function validateRequest(schemas: RequestValidationSchemas) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const sources = ['params', 'body', 'query'] as const satisfies readonly ValidationSource[];
    const failures: ValidationFailure[] = [];

    for (const source of sources) {
      const schema = schemas[source];
      if (!schema) continue;

      const result = await schema.safeParseAsync(req[source]);

      if (result.success) {
        replaceRequestData(req, source, result.data);
      } else {
        failures.push({ source, error: result.error });
      }
    }

    if (failures.length === 0) {
      next();
      return;
    }

    next(toHttpError(failures));
  }
}

function replaceRequestData(req: Request, source: ValidationSource, data: unknown): void {
  const target = req[source] as Record<string, unknown>;
  for (const key of Object.keys(target)) delete target[key];

  if (data && typeof data === 'object') {
    Object.assign(target, data);
  }
}

function toHttpError(failures: ValidationFailure[]): HttpError {
  const issues = failures.flatMap(({ source, error }) =>
    error.issues.map((issue) => ({
      ...issue,
      path: [source, ...issue.path],
    }))
  );

  const hasUuidFormatError = issues.some(
    (issue) => issue.code === 'invalid_format' && issue.format === 'uuid'
  );

  const details = issues.reduce<Record<string, Record<string, string[]>>>(
    (acc, issue) => {
      const [rawSource, ...fieldPath] = issue.path;
      const source = String(rawSource);
      const field = fieldPath.join('.') || '(root)';

      acc[source] ??= {};
      (acc[source][field] ??= []).push(issue.message);

      return acc;
    },
    {}
  );

  const sources = failures.map((f) => f.source);
  const message = hasUuidFormatError
    ? 'Invalid UUID format in path parameter'
    : `Validation failed for ${sources.join(', ')}`;

  return new HttpError(HTTP_ERRORS.badRequest.status, message, { details });
}
