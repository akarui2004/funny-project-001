import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { HttpError } from 'src/http/errors/http-error';
import { errorHandler } from 'src/http/middlewares/error-handler';
import { logger } from 'src/utils/logger';

function run(err: unknown) {
  const sent: { status?: number; body?: any } = {};
  const res = {
    status(code: number) { sent.status = code; return this; },
    json(body: unknown) { sent.body = body; return this; },
  } as unknown as Response;
  const req = { method: 'GET', originalUrl: '/x' } as Request;
  errorHandler(err, req, res, (() => {}) as NextFunction);
  return sent;
}

describe('errorHandler', () => {
  // 5xx and unknown errors are logged; keep test output clean
  before(() => { logger.silent = true; });

  it('maps a 4xx HttpError with its code, message and details', () => {
    const sent = run(new HttpError(404, 'gone', { code: 'NOT_FOUND', details: { id: 1 } }));
    assert.equal(sent.status, 404);
    assert.deepEqual(sent.body, { error: { code: 'NOT_FOUND', message: 'gone', details: { id: 1 } } });
  });

  it('omits details when the HttpError has none', () => {
    const sent = run(new HttpError(400, 'bad', { code: 'BAD_REQUEST' }));
    assert.deepEqual(sent.body, { error: { code: 'BAD_REQUEST', message: 'bad' } });
  });

  it('hides message and details of a 5xx HttpError', () => {
    const sent = run(new HttpError(503, 'db password wrong', { code: 'SERVICE_UNAVAILABLE', details: { secret: 1 } }));
    assert.equal(sent.status, 503);
    assert.deepEqual(sent.body, { error: { code: 'SERVICE_UNAVAILABLE', message: 'Internal Server Error' } });
  });

  it('maps a ZodError to 400 INVALID_INPUT with flattened details', () => {
    const result = z.object({ name: z.string() }).safeParse({});
    assert.ok(!result.success);
    const sent = run(result.error);
    assert.equal(sent.status, 400);
    assert.equal(sent.body.error.code, 'INVALID_INPUT');
    assert.deepEqual(sent.body.error.details, z.flattenError(result.error));
  });

  it('maps a body-parser SyntaxError to 400 INVALID_JSON', () => {
    const err = Object.assign(new SyntaxError('Unexpected token'), { status: 400, body: '{bad' });
    const sent = run(err);
    assert.equal(sent.status, 400);
    assert.equal(sent.body.error.code, 'INVALID_JSON');
  });

  it('treats a plain SyntaxError as an unknown 500', () => {
    const sent = run(new SyntaxError('oops'));
    assert.equal(sent.status, 500);
    assert.deepEqual(sent.body, { error: { code: 'INTERNAL_ERROR', message: 'Internal Server Error' } });
  });

  it('maps any unknown error to 500 without leaking its message', () => {
    const sent = run(new Error('stack secrets'));
    assert.equal(sent.status, 500);
    assert.deepEqual(sent.body, { error: { code: 'INTERNAL_ERROR', message: 'Internal Server Error' } });
  });
});
