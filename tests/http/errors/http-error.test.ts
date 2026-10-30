import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BaseHttpError, HTTP_ERRORS, HttpError } from 'src/http/errors/http-error';

describe('BaseHttpError', () => {
  it('is an Error with name, status and message', () => {
    const err = new HttpError(418, 'teapot');
    assert.ok(err instanceof Error);
    assert.ok(err instanceof BaseHttpError);
    assert.equal(err.name, 'HttpError');
    assert.equal(err.status, 418);
    assert.equal(err.message, 'teapot');
  });

  it('falls back to UNKNOWN_ERROR code when none is given', () => {
    assert.equal(new HttpError(400, 'x').code, BaseHttpError.UNKNOWN_ERROR_CODE);
  });

  it('keeps code, details and cause from options', () => {
    const cause = new Error('root');
    const err = new HttpError(409, 'dup', { code: 'DUP', details: { id: 1 }, cause });
    assert.equal(err.code, 'DUP');
    assert.deepEqual(err.details, { id: 1 });
    assert.equal(err.cause, cause);
  });

  it('toJSON includes details only when defined', () => {
    assert.deepEqual(new HttpError(400, 'bad').toJSON(), { status: 400, message: 'bad' });
    assert.deepEqual(
      new HttpError(400, 'bad', { details: { a: 1 } }).toJSON(),
      { status: 400, message: 'bad', details: { a: 1 } },
    );
  });
});

describe('HttpError factories', () => {
  for (const [key, def] of Object.entries(HTTP_ERRORS)) {
    it(`${key}() uses status ${def.status} and default message`, () => {
      const factory = (HttpError as unknown as Record<string, () => BaseHttpError>)[key]!;
      const err = factory();
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, def.status);
      assert.equal(err.message, def.message);
    });
  }

  it('custom message and options override the defaults', () => {
    const err = HttpError.notFound('no user', { details: { id: 7 } });
    assert.equal(err.message, 'no user');
    assert.deepEqual(err.details, { id: 7 });
  });
});
