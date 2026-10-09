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

    Object.setPrototypeOf(this, new.target.prototype);
  }

  static badRequest(message: string, code = 'BAD_REQUEST', details?: unknown): HttpError {
    return new HttpError(400, code, message, details);
  }

  static unAuthenticated(message = 'Authentication required', code = 'UNAUTHENTICATED'): HttpError {
    return new HttpError(401, code, message)
  }

  static unProcessEntity(message = 'Unprocessable entity', code = 'UNPROCESSABLE_CONTENT', details?: unknown): HttpError {
    return new HttpError(422, code, message, details);
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