# Phase 3: Cleanup, Docs, Dependent Plans

## Context
Every Sequelize mention outside code (from `grep -rln sequelize`, 2026-11-05): `README.md`, `docs/agent-context.md`, `docs/code-standards.md`, `docs/setup/installation.md`, `docs/testing/unit-testing-guide.md`, `docs/todos.md`, `docs/database/database-config-loader.md`, `docs/database/sequelize-and-sequelize-cli-relationship.md`, `docs/architecture/project-structure.md`, `docs/architecture/system-diagrams.md`, 3 excalidraw files in `docs/architecture/diagrams/`, plans `260930-2128-project-hardening-roadmap/phase-0{1,2,3,4}`, plan `261105-1105-modular-monolith-module-boundaries`.

## Docs
| File | Change |
|---|---|
| `README.md` L32-57 | Replace Sequelize CLI dump with the 4 `yarn db:*` commands. L77-101: replace the two database doc rows with the new doc below |
| `docs/database/sequelize-and-sequelize-cli-relationship.md` | **Delete** |
| `docs/database/database-config-loader.md` | Rewrite or fold into new doc: no CLI config file any more; `migrate-cli` uses `appDb` directly |
| `docs/database/kysely-and-migrations.md` | **New**: connection (`appDb.getDb<DB>()`), table types per module, migration sources + tracking tables, file format, blueprint, `require()` provider reason, lock recovery, "run from src via yarn script" |
| `docs/agent-context.md` | Entry points: remove Sequelize CLI lines, add `src/db/migration-runner.ts`, `scripts/db/migrate-cli.ts`, `build-pg-pool-config.ts`. Project rules: "Sequelize" -> "Kysely"; note `create-user` port as the single allowed edit of an applied migration |
| `docs/code-standards.md` | L49 example `buildSequelizeOptions` -> `buildPgPoolConfig`; L70-72 rewrite; L83 "Sequelize clients" -> "Kysely (`db.destroy()`)"; section L87 "Sequelize And Migrations" -> "Database And Migrations" with rules below; L162 example |
| `docs/setup/installation.md` L3, L61, L65 | stack line, tree |
| `docs/testing/unit-testing-guide.md` L148, L158 | mark done: `buildPgPoolConfig` is testable |
| `docs/todos.md` L2-3 | delete both items (no models, migrations already TS) |
| `docs/architecture/project-structure.md`, `system-diagrams.md` | rename nodes; excalidraw: update labels only if anh wants (manual, low value) |

New rules for `code-standards.md` "Database And Migrations":
- Module code gets its DB as `appDb.getDb<ModuleTables>()`; never `Kysely<any>` outside migrations
- Return plain rows/DTOs; select explicit columns for tables holding secrets (no `selectAll()` there)
- Soft delete: every read on a soft-delete table filters `deletedAt is null` through the module's repository helper
- Multi-step writes: `db.transaction().execute(async (trx) => ...)`, pass `trx` down, never mix `db` and `trx` inside one flow
- Raw SQL only via `sql` tagged template (parameterized); never string-concat values; `sql.raw` only for identifiers already validated
- Set `updatedAt` on every update (DB default covers insert only)
- Existing rules kept: applied migrations immutable, UUID keys, timestamped names, explicit transactions

## Dependent plans
### `261105-1105-modular-monolith-module-boundaries`
- `plan.md`: decision 4 -> "per-module migrations folder + tracking table (`<m>_migration`)"; risk line about Sequelize instances -> rows are plain objects already, DTO mapping still required for renames/hiding columns
- Phase 1 layout: replace `models/*.ts + init<Module>Models(sequelize)` with
  ```text
  <module>/<module>.tables.ts      # Kysely table interfaces (Generated<>, ColumnType<>) (private)
  <module>/<module>.repository.ts  # queries; gets appDb.getDb<ModuleTables>() (private)
  <module>/migrations/*.ts         # owned migrations
  ```
  `index.ts` exports `<module>MigrationSource` instead of `init<Module>Models`. Registry `src/modules/index.ts` exports `MODULE_MIGRATION_SOURCES`; `migrate-cli` runs `[PLATFORM_MIGRATION_SOURCE, ...MODULE_MIGRATION_SOURCES]`. Remove `initAllModels` wiring in `server.ts`
- Boundary test: no new rule needed. Using another module's tables requires importing its `*.tables.ts`, which rule 1 already blocks; mention this in the phase text
- `--module <m>` in migration CLI: writes to `src/modules/<m>/migrations/` (not a file-name prefix); unknown module -> error
### `260930-2128-project-hardening-roadmap`
- Phase 2 (biggest change), translate Sequelize concepts:
  | Sequelize plan item | Kysely equivalent |
  |---|---|
  | `BaseModel`, `TenantScopedModel.forTenant(tid)` | repository helper `whereTenant(qb, tenantId)` + table types with `tenantId` |
  | `Credential` `defaultScope` excludes `secret`, `scope('withSecret')` in auth only | `CREDENTIAL_PUBLIC_COLUMNS` constant used by all reads; only `auth` repository selects `secret` |
  | `uuidPrimaryKey()` + `Sequelize.literal('gen_random_uuid()')` | blueprint `primaryKey()` already has the default (phase 2 of this plan); remove step 2 "blueprint helper + fix" |
  | migration `add-uuid-default-to-users-id` | still needed (old `users.id` has no default) |
  | partial unique / CHECK via `queryInterface.sequelize.query` | `sql\`...\`.execute(db)` or `createIndex().where(...)` |
  | `initModels` after authenticate | removed |
  | seeder CLI with `seederStorage: 'sequelize'` | seeders = migration source `seed` (`seed_migration` table) if run-once tracking is wanted, or a plain script; decide in that phase |
  | one transaction for tenant + operator + credential | `db.transaction().execute(...)` |
- Phase 1: replace any Sequelize mention with Kysely terms (check file)
- Phase 3: dependency list drops `sequelize-cli`; README Sequelize dump item already done here
- Phase 4: test file `build-sequelize-options.test.ts` -> done as `build-pg-pool-config.test.ts`

## Steps
1. Docs table above
2. Dependent plans edits
3. `grep -rni "sequelize" README.md docs plans src scripts tests --exclude-dir=261105-1112-sequelize-to-kysely-migration` -> only historical mentions intended (e.g. the `create-user` comment, `SequelizeMeta` note)
4. Check every link in edited docs resolves (`docs/database/kysely-and-migrations.md` referenced from README and agent-context)
5. Mark this plan `status: done`

## Todo
- [ ] docs
- [ ] modular plan updates
- [ ] roadmap updates
- [ ] grep + link check

## Follow-up (not this plan)
- Migration `drop-sequelize-meta` (`dropTable('SequelizeMeta').ifExists()`) once Kysely ran on every environment
