import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AUTH_ACCESS_TTL_SCHEMA, AUTH_REFRESH_TTL_SCHEMA, AUTH_SCHEMA } from 'src/app/config-loader/schema/auth.schema';

const ttl = (value: number) => ({ api: value, ops: value, manager: value });

describe('AUTH_ACCESS_TTL_SCHEMA', () => {
  it('accepts 900 seconds', () => {
    assert.ok(AUTH_ACCESS_TTL_SCHEMA.safeParse(ttl(900)).success);
  });

  it('rejects below 900 seconds', () => {
    assert.equal(AUTH_ACCESS_TTL_SCHEMA.safeParse({ ...ttl(900), ops: 899 }).success, false);
  });
});

describe('AUTH_REFRESH_TTL_SCHEMA', () => {
  it('accepts 3600 seconds', () => {
    assert.ok(AUTH_REFRESH_TTL_SCHEMA.safeParse(ttl(3600)).success);
  });

  it('rejects below 3600 seconds', () => {
    assert.equal(AUTH_REFRESH_TTL_SCHEMA.safeParse({ ...ttl(3600), manager: 3599 }).success, false);
  });
});

describe('AUTH_SCHEMA', () => {
  it('rejects an empty issuer', () => {
    const input = { issuer: '', accessTtlSeconds: ttl(900), refreshTtlSeconds: ttl(3600) };
    assert.equal(AUTH_SCHEMA.safeParse(input).success, false);
  });
});
