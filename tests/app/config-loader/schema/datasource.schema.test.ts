import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DATASOURCE_MASTER_SCHEMA } from 'src/app/config-loader/schema/datasource.schema';

const master = (overrides: Record<string, unknown> = {}) => ({
  username: 'user', password: 'pass', pool: {}, option: { ssl: false }, ...overrides,
});

describe('DATASOURCE_MASTER_SCHEMA', () => {
  it('fills defaults and coerces numeric strings', () => {
    const parsed = DATASOURCE_MASTER_SCHEMA.parse(master({ port: '6543' }));
    assert.equal(parsed.port, 6543);
    assert.equal(parsed.dialect, 'postgres');
    assert.equal(parsed.schema, 'public');
    assert.deepEqual(parsed.pool, { max: 10, min: 5, acquireTimeout: 30000, idle: 10000 });
  });

  for (const key of ['username', 'password']) {
    it(`rejects an empty ${key} with a hint`, () => {
      const result = DATASOURCE_MASTER_SCHEMA.safeParse(master({ [key]: '' }));
      assert.equal(result.success, false);
      assert.match(result.error!.issues[0]!.message, new RegExp(`${key} is required`));
    });
  }
});
