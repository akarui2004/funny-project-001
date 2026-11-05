import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildPgPoolConfig } from 'src/app/connections/build-pg-pool-config';
import type { TMasterDatasourceSchema } from 'src/app/config-loader/config.type';

const datasource = (overrides: Partial<TMasterDatasourceSchema> = {}): TMasterDatasourceSchema => ({
  dialect: 'postgres',
  host: 'db.local',
  port: 6543,
  schema: 'public',
  database: 'fund',
  username: 'user',
  password: 'pass',
  pool: { max: 20, min: 2, acquireTimeout: 30000, idle: 10000 },
  option: { ssl: true },
  ...overrides,
});

describe('buildPgPoolConfig', () => {
  it('with a full datasource, maps every field to its pg name', () => {
    assert.deepEqual(buildPgPoolConfig(datasource()), {
      host: 'db.local',
      port: 6543,
      database: 'fund',
      user: 'user',
      password: 'pass',
      max: 20,
      min: 2,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 30000,
      ssl: true,
    });
  });

  it('for the public schema, omits the search_path option', () => {
    assert.equal('options' in buildPgPoolConfig(datasource()), false);
  });

  it('given a custom schema, sets search_path through startup options', () => {
    assert.equal(buildPgPoolConfig(datasource({ schema: 'fund' })).options, '-c search_path=fund');
  });
});
