import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { REDIS_SCHEMA } from 'src/app/config-loader/schema/redis.schema';

const withPrefix = (keyPrefix: string) => {
  const conn = { keyPrefix, option: {} };
  return { master: conn, queue: conn };
};

describe('REDIS_SCHEMA keyPrefix', () => {
  const cases: Array<[string, boolean]> = [
    ['app:', true],
    ['App01:', true],
    ['app', false],
    ['app:x:', false],
    ['my-app:', false],
    [':', false],
  ];

  for (const [prefix, ok] of cases) {
    it(`${ok ? 'accepts' : 'rejects'} "${prefix}"`, () => {
      assert.equal(REDIS_SCHEMA.safeParse(withPrefix(prefix)).success, ok);
    });
  }

  it('fills connection defaults', () => {
    const parsed = REDIS_SCHEMA.parse(withPrefix('app:'));
    assert.equal(parsed.master.host, 'localhost');
    assert.equal(parsed.master.port, 6379);
    assert.equal(parsed.master.option.maxRetriesPerRequest, 5);
  });
});
