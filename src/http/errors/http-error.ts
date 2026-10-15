export interface HttpErrorPayload {
  status: number;
  code: string;
  message: string;
}

export interface HttpErrorOptions<T = unknown> {
  code?: string;
  details?: T;
  cause?: unknown;
}

export const HTTP_ERRORS = {
  // --- Client Errors (4xx) ---
  badRequest: { status: 400, code: 'BAD_REQUEST', message: 'Bad Request' },
  unauthorized: { status: 401, code: 'UNAUTHORIZED', message: 'Authentication required' },
  forbidden: { status: 403, code: 'FORBIDDEN', message: 'Access denied' },
  notFound: { status: 404, code: 'NOT_FOUND', message: 'Resource not found' },
  conflict: { status: 409, code: 'CONFLICT', message: 'Conflict occurred' },
  unprocessableEntity: { status: 422, code: 'UNPROCESSABLE_ENTITY', message: 'Unprocessable entity' },
  tooManyRequest: { status: 429, code: 'TOO_MANY_REQUESTS', message: 'Too many requests' },
  // --- Server Errors (5xx) ---
  internal: { status: 500, code: 'INTERNAL_ERROR', message: 'Internal Server Error' },
  serviceUnavailable: { status: 503, code: 'SERVICE_UNAVAILABLE', message: 'Service unavailable' },
} as const satisfies Record<string, HttpErrorPayload>;

type HttpDefinitions = typeof HTTP_ERRORS;

export class BaseHttpError<T = unknown> extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: T;

  public static readonly UNKNOWN_ERROR_CODE = 'UNKNOWN_ERROR';

  constructor(status: number, message: string, options: HttpErrorOptions<T> = {}) {
    super(message, { cause: options.cause });
    this.name = 'HttpError';
    this.status = status;
    this.code = options.code ?? BaseHttpError.UNKNOWN_ERROR_CODE;
    this.details = options.details;

    Object.setPrototypeOf(this, new.target.prototype);
  }

  // --- Helpers ---
  public toJSON() {
    return {
      status: this.status,
      // code: this.code,
      message: this.message,
      ...(this.details !== undefined && { details: this.details }),
    };
  }
}

type StaticErrorMethods = {
  [K in keyof HttpDefinitions]: <T = unknown>(message?: string, options?: HttpErrorOptions<T>) => BaseHttpError<T>;
}

for (const [key, def] of Object.entries(HTTP_ERRORS)) {
  (BaseHttpError as unknown as Record<string, unknown>)[key] = function <T>(message?: string, options?: HttpErrorOptions<T>) {
    return new BaseHttpError<T>(def.status, message ?? def.message, options)
  }
}

export const HttpErrors = BaseHttpError as typeof BaseHttpError & StaticErrorMethods;
export const HttpError = HttpErrors;

export type HttpError<T = unknown> = BaseHttpError<T>;
export type HttpErrors<T = unknown> = BaseHttpError<T>;