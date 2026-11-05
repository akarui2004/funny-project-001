# Kysely and Migrations

PostgreSQL access goes through [Kysely](https://kysely.dev) (typed SQL query builder) over one
`pg.Pool` per datasource. There are no models, no global registry and no associations: rows are plain
objects. Migrations run through Kysely's `Migrator`, wrapped by a small project CLI.

```mermaid
flowchart LR
    toml["config/*.toml<br/>datasource.master"] --> loader["appConfig<br/>(Zod validated)"]
    loader --> mapper["buildPgPoolConfig()<br/>src/app/connections/build-pg-pool-config.ts"]
    mapper --> appDb["appDb<br/>src/app/connections/database.ts"]
    appDb --> server["src/server.ts (runtime)"]
    appDb --> cli["scripts/db/migrate-cli.ts<br/>(yarn db:migrate*)"]
    cli --> runner["src/db/migration-runner.ts<br/>(Migrator per source)"]
    runner --> migrations["src/db/migrations/*.ts"]
```

The runtime and the migration CLI share `appDb`, so both connect with the same settings.

## Connection

- `await appDb.initialize('master')` creates the pool and runs `select 1` (pg connects lazily, so this
  proves the connection at boot). On failure the pool is destroyed and the error rethrown.
- `appDb.getDb<DB>()` returns `Kysely<DB>`; it throws if `initialize()` was not called. Pass the table
  interface the caller may touch; a module passes only its own tables. Never use `Kysely<any>` outside
  migrations.
- `appDb.disconnectAll()` destroys every pool (graceful shutdown).
- SQL is logged at `debug` (`LOG_LEVEL=debug`). Query parameters are never logged.

TOML → `pg.PoolConfig` mapping (`buildPgPoolConfig`):

| TOML (`datasource.master`) | pg | Note |
|---|---|---|
| `host`, `port`, `database`, `password` | same | |
| `username` | `user` | |
| `pool.max` / `pool.min` | `max` / `min` | |
| `pool.idle` | `idleTimeoutMillis` | |
| `pool.acquireTimeout` | `connectionTimeoutMillis` | pg has one timeout for getting a client, incl. connecting |
| `option.ssl` | `ssl` | |
| `schema` | `options: -c search_path=<schema>` | only when not `public`; must be a lowercase identifier |
| `dialect` | — | only `postgres` is accepted |

## Commands

| Command | What it does |
|---|---|
| `yarn db:migrate` | Apply all pending migrations of every source |
| `yarn db:migrate:undo [--source <name>]` | Undo the last migration of one source (default `platform`) |
| `yarn db:migrate:status` | List each migration as executed (with time) or pending |
| `yarn db:migration:create <name> [--module <m>]` | Create an empty `<timestamp>-<name>.ts` in `src/db/migrations/` (or `src/modules/<m>/migrations/`) |

Like the app, the CLI loads `.env` (through `yarn script`) and the layered TOML config; select the
environment with `NODE_ENV`. Exit code is `1` when a migration fails.

## Migration Sources

A source is a folder plus its own tracking tables `<name>_migration` and `<name>_migration_lock`
(`MigrationSource` in `src/db/migration-runner.ts`). Today only `platform` exists
(`src/db/migrations/`). A module can later own `src/modules/<m>/migrations/` with its own tables;
order across sources does not matter because cross-module foreign keys are banned. Add new sources to
`MIGRATION_SOURCES`.

Migrations are loaded with `require()` (`RequireMigrationProvider`), not Kysely's
`FileMigrationProvider`: its native `import()` bypasses ts-node + tsconfig-paths, so `src/*` imports
inside migrations would fail. Consequence: run migrations from source through `yarn script` (the
`db:*` scripts do), or from `dist/` after `yarn build`.

## Migration File Format

Write migrations by hand with the Kysely schema builder; `db:migration:create` only creates the file.

```ts
import { sql } from 'kysely';
import type { Kysely } from 'kysely';
import { oneOf, primaryKey, softDelete, timestamps } from 'src/db/migration-blueprint';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.createTable('products')
    .$call(primaryKey)
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('price', 'numeric(36, 18)', (col) => col.notNull().defaultTo('0'))
    .addColumn('status', 'varchar(64)', (col) => col.notNull().defaultTo('draft').check(oneOf('status', ['draft', 'live'])))
    .$call(softDelete)
    .$call(timestamps)
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('products').execute();
}
```

The migration name is the file name without extension. On PostgreSQL, Kysely runs pending migrations in
one transaction.

## Blueprint Helpers (`src/db/migration-blueprint.ts`)

Only project conventions live here; plain column types are written with Kysely directly.

| Helper | Use | PostgreSQL |
|---|---|---|
| `primaryKey` | `.$call(primaryKey)` | `id uuid default gen_random_uuid() not null primary key` |
| `softDelete` | `.$call(softDelete)` | `deletedAt timestamptz` |
| `timestamps` | `.$call(timestamps)` | `createdAt`, `updatedAt` `timestamptz default now() not null` |
| `oneOf(col, values)` | `col.check(oneOf(...))` | `check (col in (...))`: varchar enum, no PG enum type |
| `nonNegative(col)` | `col.check(nonNegative(...))` | `check (col >= 0)`: PG has no unsigned types |

Never change what an existing helper emits: migrations replay it on fresh databases, so old and new
databases would diverge. Add a new helper instead. `tests/db/migration-blueprint.test.ts` pins the DDL.
`updatedAt` has no trigger: set it on every update.

## History: Sequelize Baseline

`20260724075029-create-user.ts` was originally a Sequelize migration. It was ported in place, hand-written
and idempotent (`IF NOT EXISTS`, keeps the `enum_users_role` type name), so databases created by Sequelize
skip it and fresh databases get an identical schema. This is the only allowed edit of an applied
migration. A leftover `SequelizeMeta` table in an old local database is unused and can be dropped by hand.

## Troubleshooting

- **Lock left behind after a crash**: once sure no runner is active,
  `update platform_migration_lock set is_locked = 0;`
- **`Unable to connect`**: check `datasource.master` in `config/<env>.local.toml`; the CLI exits `1` and
  closes the pool.
