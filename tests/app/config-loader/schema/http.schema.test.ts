import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HTTP_CORS_SCHEMA, HTTP_RATE_LIMIT_SCHEMA } from 'src/app/config-loader/schema/http.schema';

describe('HTTP_RATE_LIMIT_SCHEMA', () => {
  const cases: Array<[string, unknown, boolean]> = [
    ['the minimum values', { windowMs: 30000, limit: 100 }, true],
    ['windowMs below 30000', { windowMs: 29999, limit: 100 }, false],
    ['limit below 100', { windowMs: 30000, limit: 99 }, false],
    ['a non-integer limit', { windowMs: 30000, limit: 100.5 }, false],
    ['a numeric string (not coerced)', { windowMs: '30000', limit: 100 }, false],
  ];

  for (const [label, input, ok] of cases) {
    it(`for ${label}, ${ok ? 'accepts' : 'rejects'} it`, () => {
      assert.equal(HTTP_RATE_LIMIT_SCHEMA.safeParse(input).success, ok);
    });
  }
});

describe('HTTP_CORS_SCHEMA', () => {
  it('given an empty origin list, accepts it', () => {
    assert.ok(HTTP_CORS_SCHEMA.safeParse({ origins: [] }).success);
  });

  it('given an empty origin string, rejects it', () => {
    assert.equal(HTTP_CORS_SCHEMA.safeParse({ origins: [''] }).success, false);
  });
});
