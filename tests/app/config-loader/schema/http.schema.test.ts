import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HTTP_CORS_SCHEMA, HTTP_JSON_LIMIT_SCHEMA, HTTP_RATE_LIMIT_SCHEMA, HTTP_TRUST_PROXY_SCHEMA } from 'src/app/config-loader/schema/http.schema';

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

describe('HTTP_TRUST_PROXY_SCHEMA', () => {
  const cases: Array<[string, unknown, boolean]> = [
    ['false', false, true],
    ['true', true, true],
    ['a hop count', 1, true],
    ['zero hops', 0, true],
    ['a negative hop count', -1, false],
    ['a fractional hop count', 1.5, false],
    ['a keyword', 'loopback', true],
    ['a single CIDR', '10.0.0.0/8', true],
    ['an IPv6 CIDR', 'fd00::/8', true],
    ['a list of CIDRs and keywords', ['10.0.0.0/8', 'loopback'], true],
    ['an empty list', [], false],
    ['an unknown name', 'my-proxy', false],
    ['a list with an invalid entry', ['10.0.0.0/8', '10.0.0.0/33'], false],
    ['an empty string', '', false],
  ];

  for (const [label, input, ok] of cases) {
    it(`for ${label}, ${ok ? 'accepts' : 'rejects'} it`, () => {
      assert.equal(HTTP_TRUST_PROXY_SCHEMA.safeParse(input).success, ok);
    });
  }
});

describe('HTTP_JSON_LIMIT_SCHEMA', () => {
  const cases: Array<[string, unknown, boolean]> = [
    ['100kb', '100kb', true],
    ['1MB (case-insensitive)', '1MB', true],
    ['a bare number string', '100', false],
    ['a number (not coerced)', 100, false],
    ['an unknown unit', '10tb', false],
  ];

  for (const [label, input, ok] of cases) {
    it(`for ${label}, ${ok ? 'accepts' : 'rejects'} it`, () => {
      assert.equal(HTTP_JSON_LIMIT_SCHEMA.safeParse(input).success, ok);
    });
  }
});
