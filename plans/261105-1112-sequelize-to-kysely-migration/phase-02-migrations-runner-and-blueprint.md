# Phase 2: Migrations (Runner, CLI, Blueprint, Baseline)

## Context
- Runner today: `sequelize-cli` via `.sequelizerc` -> `src/db/sequelize-cli-config.cjs`; scripts `db:migrate`, `db:migrate:undo`, `db:seed:all`
- `src/db/migration-blueprint.ts`: helpers returning Sequelize `ModelAttributeColumnOptions` (`primaryKey, uuid, genericString, text, integer, unsignedInteger, bigInteger, decimal, datetime, date, enumType, jsonType, foreignKey, softDeleteColumns, timestampColumns`)
- Scaffold: `scripts/db/migration-cli.ts` + `template/migration.mustache` + `helpers/migration-column-renderer.ts` (emits lines `name: MigrationUtils.<helper>(args)`), tests in `tests/scripts/db/helpers/`
- Applied migration `src/db/migrations/20260724075029-create-user.ts`; `SequelizeMeta` holds `20260724075029-create-user.ts`
- Known blueprint bugs (roadmap phase 2): `primaryKey()` has no UUID default; `uuid()` ignores `unique`

## Design

### Migration file format (Kysely)
```ts
import { Kysely } from 'kysely';
export async function up(db: Kysely<any>): Promise<void> { ... }
export async function down(db: Kysely<any>): Promise<void> { ... }
```
`Kysely<any>` is allowed **only** in migrations (they run against whatever schema exists at that point in history).

### Blueprint keeps its object-literal style
So the renderer and its tests stay unchanged, helpers return a column spec, and one helper applies a map of specs to a table builder:
```ts
import { ColumnDefinitionBuilder, CreateTableBuilder, sql, DataTypeExpression } from 'kysely';

export type ColumnSpec = {
  type: DataTypeExpression;
  build: (col: ColumnDefinitionBuilder, name: string) => ColumnDefinitionBuilder;
};

// Applies { columnName: spec } in insertion order
export const addColumns = <TB extends string>(table: CreateTableBuilder<TB, any>, columns: Record<string, ColumnSpec>) =>
  Object.entries(columns).reduce((t, [name, spec]) => t.addColumn(name, spec.type, (c) => spec.build(c, name)), table);
```
Helper mapping (same names and positional signatures as today):

| Helper | Postgres result |
|---|---|
| `primaryKey()` | `uuid primary key not null default gen_random_uuid()` (fixes missing default; safe because `create-user` is hand-ported, below) |
| `uuid(required, unique)` | `uuid`, `not null` if required, `unique` if unique (fixes ignored param) |
| `genericString(required, length=255, default?)` | `varchar(length)` |
| `text(required)` | `text` |
| `integer(required, default?)` | `integer` |
| `unsignedInteger(required, default?)` | `integer` + `check (<col> >= 0)` (PG has no unsigned) |
| `bigInteger(required, default?: bigint)` | `bigint`, default via `String(value)` |
| `decimal(required, p=36, s=18, default=0)` | `numeric(p, s)`, `defaultTo(String(default))` (drops `BigNumber` import) |
| `datetime(required, default?)` | `timestamptz` (Sequelize `DATE` on PG = timestamptz) |
| `date(required, default?)` | `date` |
| `enumType(values, required, default?)` | `varchar(64)` + `check (<col> in (...))` (decision 6) |
| `jsonType(required)` | `jsonb` |
| `foreignKey(refTable, refCol='id', required, type=uuid, onDelete, onUpdate)` | `references refTable.refCol` + `onDelete/onUpdate`. Same-module only (modular rule) |
| `timestampColumns` | `createdAt`, `updatedAt` `timestamptz not null default now()` |
| `softDeleteColumns` | `deletedAt timestamptz null` |

String defaults that are SQL functions (e.g. `'now()'`) previously came as Sequelize literals; accept `string | RawBuilder` and pass `RawBuilder` through `defaultTo` (callers use ``sql`now()` ``).

Values in CHECK lists go through `sql.lit` / `sql.join`, never string concat.

### Template (`scripts/db/template/migration.mustache`)
```ts
import { Kysely } from 'kysely';
import * as MigrationUtils from 'src/db/migration-blueprint';

export async function up(db: Kysely<any>): Promise<void> {
  await MigrationUtils.addColumns(db.schema.createTable('{{table}}'), {
    id: MigrationUtils.primaryKey(),
    {{#migrationColumns}}
    {{{.}}},
    {{/migrationColumns}}
    {{#softDelete}}
    ...MigrationUtils.softDeleteColumns,
    {{/softDelete}}
    ...MigrationUtils.timestampColumns,
  }).execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('{{table}}').execute();
}
```
Renderer output unchanged (`name: MigrationUtils.x(...)`), so `migration-column-renderer.test.ts` and parser test need no edits. `migration-cli.ts` unchanged (still writes to `src/db/migrations/`; modular phase 1 adds `--module`, which now picks the folder `src/modules/<m>/migrations/` instead of a file-name prefix).

### Runner (`src/db/migration-runner.ts`)
```ts
export type MigrationSource = { name: string; folder: string };   // name -> tables `<name>_migration`, `<name>_migration_lock`

export const PLATFORM_MIGRATION_SOURCE: MigrationSource = { name: 'platform', folder: path.resolve(__dirname, 'migrations') };

// require()-based provider: goes through ts-node + tsconfig-paths in dev and plain require in dist,
// unlike FileMigrationProvider's native import() which cannot resolve the `src/*` alias
class RequireMigrationProvider implements MigrationProvider {
  constructor(private folder: string) {}
  async getMigrations() {
    const files = (await fs.readdir(this.folder))
      .filter((f) => /\.(ts|js)$/.test(f) && !f.endsWith('.d.ts'))
      .sort();
    return Object.fromEntries(files.map((f) => [path.parse(f).name, require(path.join(this.folder, f)) as Migration]));
  }
}

export const createMigrator = (db: Kysely<any>, source: MigrationSource) => new Migrator({
  db,
  provider: new RequireMigrationProvider(source.folder),
  migrationTableName: `${source.name}_migration`,
  migrationLockTableName: `${source.name}_migration_lock`,
});
```
- Source name validated `^[a-z][a-z0-9_]*$` (it becomes a table name)
- Migration name = file name without extension, so `20260724075029-create-user.ts` -> `20260724075029-create-user` (same in dev `.ts` and dist `.js`)
- Check `MigrationResultSet.error` after every call: log each `results[]` entry (`Success`/`Error`/`NotExecuted`), throw on error so the CLI exits 1
- Verify `migrationTableName` / `migrationLockTableName` option names against the installed `kysely` typings before coding

### CLI (`scripts/db/migrate-cli.ts`, extends `BaseCli`)
Command `migrate <action>` with `action` in `up | down | status`, option `--source <name>` (default `platform`; only `platform` exists now):
- `up`: `migrateToLatest()` for every source (now only platform)
- `down`: `migrateDown()` on `--source` only (undo one step)
- `status`: `getMigrations()` -> table of name + executed-at / pending
- Initializes `appDb` (`master`), always `appDb.disconnectAll()` in `finally`

`package.json` scripts:
```json
"db:migrate": "yarn script ./scripts/db/migrate-cli migrate up",
"db:migrate:undo": "yarn script ./scripts/db/migrate-cli migrate down",
"db:migrate:status": "yarn script ./scripts/db/migrate-cli migrate status",
```
Remove `db:seed:all` (no seeders exist; roadmap phase 2 builds its own).

### Baseline: port `create-user` in place (decision 3)
Reproduce exactly what Sequelize created, idempotently:
```ts
export async function up(db: Kysely<any>): Promise<void> {
  // Sequelize named enum types enum_<table>_<column>; keep the name so existing DBs match
  // Postgres has no CREATE TYPE IF NOT EXISTS; to_regtype resolves via search_path and is NULL when absent
  const { rows } = await sql<{ type: string | null }>`SELECT to_regtype('enum_users_role') AS type`.execute(db);
  if (!rows[0]?.type) {
    await db.schema.createType('enum_users_role')
      .asEnum(['admin', 'sub-admin', 'member', 'guest'])
      .execute();
  }

  await db.schema.createTable('users').ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey().notNull())          // no default: original had none
    .addColumn('username', 'varchar(255)', (c) => c.notNull())
    .addColumn('password', 'varchar(255)', (c) => c.notNull())
    .addColumn('role', sql`"enum_users_role"`, (c) => c.defaultTo('guest'))
    .addColumn('deletedAt', 'timestamptz')
    .addColumn('createdAt', 'timestamptz', (c) => c.notNull())
    .addColumn('updatedAt', 'timestamptz', (c) => c.notNull())
    .execute();
}
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('users').ifExists().execute();
  await db.schema.dropType('enum_users_role').ifExists().execute();
}
```
Hand-written on purpose (not via blueprint) so later blueprint changes never alter history. Header comment states the invariant (no plan IDs in code): "Must stay schema-identical to the table Sequelize created; existing databases skip it via IF NOT EXISTS."

### Delete
`.sequelizerc`, `src/db/sequelize-cli-config.cjs`, `buildSequelizeOptions`, `src/db/models/` and `src/db/seeders/` placeholders (Kysely has no models; modular plan puts table types in modules). Then `yarn remove sequelize sequelize-cli`.

## Tests
- `tests/db/migration-blueprint.test.ts`: compile without a DB using Kysely's `DummyDriver` + `PostgresAdapter`/`PostgresIntrospector`/`PostgresQueryCompiler`, then assert `.compile().sql` for:
  - `primaryKey()` contains `default gen_random_uuid()`
  - `uuid(true, true)` -> `not null unique`
  - `enumType(['a','b'], true, 'a')` -> `check` with both values, `default 'a'`
  - `decimal()` -> `numeric(36, 18)` + `default '0'`
  - `timestampColumns` -> `default now()`
- `tests/db/migration-runner.test.ts`: `RequireMigrationProvider` on a temp dir (use `fs.mkdtemp` under `os.tmpdir()`) with `001-a.js`, `002-b.js`, `x.d.ts`, `readme.md` -> keys `['001-a','002-b']` in order; invalid source name throws
- Existing parser/renderer tests unchanged and green

## Steps
1. **Back up dev DB**: `pg_dump -Fc fund_project > backups/<date>-before-kysely.dump`; also `pg_dump --schema-only fund_project > /tmp/before.sql`
2. Blueprint port + tests
3. Runner + provider + tests
4. CLI + `package.json` scripts
5. Port `create-user`; update template
6. Delete Sequelize files; `yarn remove sequelize sequelize-cli`; `grep -rn "sequelize" src scripts tests` returns nothing
7. `yarn build && yarn test && yarn test:types`
8. DB validation (below)

## Validation (DB)
1. **Existing DB**: `yarn db:migrate:status` -> `20260724075029-create-user` pending; `yarn db:migrate` -> success, no error; `status` -> executed. Dump schema to `after.sql`; `diff before.sql after.sql` shows only `platform_migration*` tables
2. **Fresh DB** (`createdb fund_project_scratch`, point `.local.toml` at it): `yarn db:migrate`; `pg_dump --schema-only` -> diff against `after.sql`, excluding `SequelizeMeta`, must be empty. This proves the port is identical
3. `yarn db:migrate:undo` on scratch -> `users` and `enum_users_role` gone; `yarn db:migrate` again -> back
4. Scaffold smoke: `yarn db:migration:create product -c "name:string,price:decimal(10,2),status:enum[a,b]:default[a]"` -> run on scratch -> `\d products` shows uuid default, numeric(10,2), check constraint; undo; delete the generated file
5. Two `yarn db:migrate` in parallel on scratch -> one waits on the lock, both exit 0
6. Drop scratch DB; restore `.local.toml`

## Todo
- [ ] backup + schema snapshot
- [ ] blueprint port + tests
- [ ] runner + provider + tests
- [ ] migrate CLI + scripts
- [ ] create-user port + template
- [ ] delete Sequelize files + deps
- [ ] DB validation 1-6

## Risks
- Schema diff shows small differences (e.g. default `'guest'::enum_users_role` cast text): fix the port until diff is empty; never "accept" a diff
- `require()` of `.ts` only works through `yarn script` (ts-node). Running migrations from `dist/` needs `yarn build` first; document in deployment notes
- Lock table left behind after a crash: Kysely lock is a row flag; doc how to clear (`update platform_migration_lock set is_locked = 0`) after confirming no runner is active
