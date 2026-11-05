# Phase 1: Connection Layer (Kysely + pg Pool)

## Context
- `src/app/connections/database.ts`: `buildSequelizeOptions(datasource)` + `DatabaseManager` (`initialize`, `disconnect`, `disconnectAll`, `getDb`) exported as `appDb`
- `src/server.ts` calls `appDb.initialize('master')` and `appDb.disconnectAll()`; nothing calls `getDb()` yet
- Config schema `src/app/config-loader/schema/datasource.schema.ts`: `dialect, host, port, schema, database, username, password, pool{max,min,acquireTimeout,idle}, option{ssl,connectionTimeout}`
- `docs/testing/unit-testing-guide.md:148` notes `buildSequelizeOptions` is untestable because importing `database.ts` constructs `appDb` (loads TOML). Fix that here by moving the mapper to its own file

## Install
```bash
yarn add kysely@0.29.8          # exact pin, pre-1.0
yarn add -D @types/pg
```
Do not remove `sequelize` yet (CLI still needs it until phase 2).

## Files
```text
src/app/connections/build-pg-pool-config.ts      # NEW: TOML datasource -> pg.PoolConfig (pure, no appConfig import)
src/app/connections/database.ts                  # REWRITE: Kysely manager
src/app/config-loader/schema/datasource.schema.ts# dialect literal, drop option.connectionTimeout
config/base.toml                                 # drop option.connectionTimeout
tests/app/connections/build-pg-pool-config.test.ts # NEW
```

## Config mapping (`build-pg-pool-config.ts`)
| TOML | `pg.PoolConfig` | Note |
|---|---|---|
| `host`, `port`, `database` | same | |
| `username` | `user` | |
| `password` | `password` | |
| `pool.max` / `pool.min` | `max` / `min` | `min` supported by pg-pool >= 3.7 (installed 3.14) |
| `pool.idle` | `idleTimeoutMillis` | |
| `pool.acquireTimeout` | `connectionTimeoutMillis` | pg uses one timeout for "get a client", covers connect too |
| `option.ssl` | `ssl` | boolean ok |
| `schema` | `options: '-c search_path=<schema>'` | only when schema != `public`; validate `^[a-z_][a-z0-9_]*$` in Zod so nothing odd reaches the startup packet |
| `option.connectionTimeout` | — | **removed**: no separate pg equivalent. Zod strips unknown keys, so old `.local.toml` files keep working |
| `dialect` | — | Zod `z.literal('postgres').default('postgres')` |

Sketch:
```ts
import type { PoolConfig } from 'pg';
import type { TMasterDatasourceSchema } from '../config-loader/config.type';

// Pure mapping, kept out of database.ts so it can be unit-tested without loading TOML config
export const buildPgPoolConfig = (ds: TMasterDatasourceSchema): PoolConfig => ({
  host: ds.host, port: ds.port, database: ds.database,
  user: ds.username, password: ds.password,
  max: ds.pool.max, min: ds.pool.min,
  idleTimeoutMillis: ds.pool.idle,
  connectionTimeoutMillis: ds.pool.acquireTimeout,
  ssl: ds.option.ssl,
  ...(ds.schema && ds.schema !== 'public' ? { options: `-c search_path=${ds.schema}` } : {}),
});
```

## `database.ts` rewrite
```ts
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';

class DatabaseManager {
  private dbClients: Partial<Record<keyof TDatasourceSchema, Kysely<any>>> = {};

  async initialize(connType = 'master') {
    if (this.dbClients[connType]) return;
    const db = new Kysely<any>({
      dialect: new PostgresDialect({ pool: new Pool(buildPgPoolConfig(this.dbConfig[connType])) }),
      log: (event) => { /* query -> log.debug(sql + ms), error -> log.error(sql + message) */ },
    });
    try {
      // pg Pool connects lazily; a round-trip replaces sequelize.authenticate()
      await sql`select 1`.execute(db);
    } catch (error) {
      await db.destroy();          // do not leave a half-open pool
      throw error;                 // keep current log + rethrow behaviour
    }
    this.dbClients[connType] = db;
  }

  async disconnect(connType) { await client.destroy(); ... }   // same shape as today

  // Caller states which tables it may see; modules pass their own table interface only
  getDb<DB>(connType = 'master'): Kysely<DB> { ...same throw...; return client as Kysely<DB>; }
}
```
Rules:
- `log` callback: `event.level === 'query'` -> `log.debug(\`${event.query.sql} (${event.queryDurationMillis}ms)\`)`; `'error'` -> `log.error`. **Never log `event.query.parameters`** (passwords, secrets in later phases)
- Keep `getDb` throw contract (same as `appRedis.getClient()`)
- `getDb` has no default type param on purpose: forgetting `<DB>` gives `Kysely<unknown>`-like errors instead of silent `any`
- `buildSequelizeOptions` stays exported until phase 2 deletes `sequelize-cli-config.cjs` (the CLI still imports it). Simplest: leave the old function in place untouched this phase, delete in phase 2

## Tests
`tests/app/connections/build-pg-pool-config.test.ts` (`describe('buildPgPoolConfig')`):
- maps every field (one `it` with a full fixture, deep-equal)
- `schema: 'public'` -> no `options` key
- `schema: 'fund'` -> `options === '-c search_path=fund'`
Schema test (if `tests/app/config-loader` has one for datasource): invalid schema name rejected; `dialect: 'mysql'` rejected.

## Steps
1. Install deps
2. Zod schema + `config/base.toml` edit; run `yarn config:validate`
3. `build-pg-pool-config.ts` + test
4. Rewrite `DatabaseManager` on Kysely
5. `yarn build && yarn test && yarn test:types`
6. Boot: `yarn dev` against local Postgres; log shows `[master] Connection established`; stop with Ctrl-C, log shows `Connection closed`, process exits (no hanging pool)
7. Wrong password in `.local.toml` -> startup fails with clear error, process exits (pool destroyed)

## Todo
- [ ] deps
- [ ] schema + toml
- [ ] pool config mapper + test
- [ ] DatabaseManager rewrite
- [ ] boot / shutdown / bad-password checks

## Risks
- `search_path` via startup `options` is ignored by some poolers (PgBouncer transaction mode). Not used now; if added later, use `db.withSchema()` instead
- `ssl: true` with self-signed certs needs `{ rejectUnauthorized: false }`; out of scope, same as today
