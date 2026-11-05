import type { PoolConfig } from 'pg';
import type { TMasterDatasourceSchema } from '../config-loader/config.type';

/**
 * Maps a TOML datasource entry to pg Pool options.
 * Kept out of database.ts (which loads the TOML config on import) so it stays a pure, unit-testable mapping.
 */
export const buildPgPoolConfig = (datasource: TMasterDatasourceSchema): PoolConfig => {
  const { host, port, schema, database, username, password, pool, option } = datasource;
  return {
    host, port, database,
    user: username,
    password,
    max: pool.max,
    min: pool.min,
    idleTimeoutMillis: pool.idle,
    // pg uses one timeout for "get a client from the pool", which also covers opening a new connection
    connectionTimeoutMillis: pool.acquireTimeout,
    ssl: option.ssl,
    // schema is validated as a plain identifier by the Zod schema, so it is safe in the startup packet
    ...(schema !== 'public' ? { options: `-c search_path=${schema}` } : {}),
  };
};
