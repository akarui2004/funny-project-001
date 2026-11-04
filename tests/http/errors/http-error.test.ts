import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BaseHttpError, HTTP_ERRORS, HttpError } from 'src/http/errors/http-error';

describe('BaseHttpError', () => {
  it('given a new error, it is an Error with name, status and message', () => {
    const err = new HttpError(418, 'teapot');
    assert.ok(err instanceof Error);
    assert.ok(err instanceof BaseHttpError);
    assert.equal(err.name, 'HttpError');
    assert.equal(err.status, 418);
    assert.equal(err.message, 'teapot');
  });

  it('without a code, falls back to UNKNOWN_ERROR', () => {
    assert.equal(new HttpError(400, 'x').code, BaseHttpError.UNKNOWN_ERROR_CODE);
  });

  it('with options, keeps code, details and cause', () => {
    const cause = new Error('root');
    const err = new HttpError(409, 'dup', { code: 'DUP', details: { id: 1 }, cause });
    assert.equal(err.code, 'DUP');
    assert.deepEqual(err.details, { id: 1 });
    assert.equal(err.cause, cause);
  });

  it('when serialized to JSON, includes details only if defined', () => {
    assert.deepEqual(new HttpError(400, 'bad').toJSON(), { status: 400, message: 'bad' });
    assert.deepEqual(
      new HttpError(400, 'bad', { details: { a: 1 } }).toJSON(),
      { status: 400, message: 'bad', details: { a: 1 } },
    );
  });
});

describe('HttpError factories', () => {
  for (const [key, def] of Object.entries(HTTP_ERRORS)) {
    it(`for ${key}(), uses status ${def.status} and the default message`, () => {
      const factory = (HttpError as unknown as Record<string, () => BaseHttpError>)[key]!;
      const err = factory();
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, def.status);
      assert.equal(err.message, def.message);
      assert.equal(err.code, def.code);
    });
  }

  it('with a custom message and options, overrides the defaults', () => {
    const err = HttpError.notFound('no user', { details: { id: 7 } });
    assert.equal(err.message, 'no user');
    assert.deepEqual(err.details, { id: 7 });
  });

  it('with an explicit code option, overrides the default code', () => {
    assert.equal(HttpError.notFound('x', { code: 'USER_NOT_FOUND' }).code, 'USER_NOT_FOUND');
  });
});
