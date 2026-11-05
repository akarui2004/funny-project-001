---
title: Replace Sequelize with Kysely (query builder + migrator)
status: done
created: 2026-11-05
updated: 2026-11-05
---

# Sequelize -> Kysely

## Overview
Sequelize works against the modular-monolith rules in `plans/261105-1105-modular-monolith-module-boundaries/`:
- one global model registry (`sequelize.models.X`) lets any module reach another module's table without an import, so the boundary test cannot see it
- associations/`include` make cross-module JOINs the easy path
- model instances (`save()`, lazy getters) leak through the bridge unless every caller remembers `toJSON()`
- `sequelize-cli` has one migrations path, so per-module migrations need file-name conventions and filtering at split time

Kysely is a typed SQL query builder: no models, no registry, no associations, rows are plain objects (already DTO-shaped). Each module gets a `Kysely<ModuleTables>` handle typed with only its own tables, so touching another module's table is a **compile error**. Its built-in `Migrator` supports one tracking table per migration source, so each module can own its migrations folder.

Best moment to switch: Sequelize lives in only 4 files, `src/db/models/` is empty, one migration applied.

Facts checked 2026-11-05: `kysely` latest `0.29.8`; `pg@^8.20.0` + `pg-pool@3.14.0` installed (supports `min`); `@types/pg` not installed; `bignumber.js` only imported by `src/db/migration-blueprint.ts`.

## Outcome / acceptance criteria
- `sequelize`, `sequelize-cli`, `.sequelizerc`, `src/db/sequelize-cli-config.cjs` gone; `kysely` + `@types/pg` added
- `appDb.getDb<DB>()` returns `Kysely<DB>` over one `pg.Pool` per connection type; same config contract (TOML `datasource.master`)
- `yarn db:migrate` / `db:migrate:undo` / `db:migrate:status` run through Kysely `Migrator`, migration source list ready for per-module folders
- Existing dev DB (already has `users` from Sequelize) and a fresh DB end with **identical schema** (`pg_dump --schema-only` diff empty, except migration bookkeeping tables)
- `yarn db:migration:create <name> [--module <m>]` creates an empty Kysely migration (2026-11-05: column scaffold, parser/renderer, mustache template removed; Kysely builder is concise enough, blueprint reduced to conventions `primaryKey`/`timestamps`/`softDelete`/`oneOf`/`nonNegative`)
- `yarn build`, `yarn test`, `yarn test:types` green; new unit tests for pool config mapping and blueprint SQL
- Docs and dependent plans (modular plan, roadmap phases 2-4) updated to Kysely terms

## Non-goals
- No `kysely-codegen` (one global DB type breaks module boundaries; tables typed by hand per module)
- No `CamelCasePlugin` (columns are already camelCase, no `underscored`)
- No seeder runner (roadmap phase 2 step 11 owns it; redesign noted in phase 3)
- Not dropping `SequelizeMeta` table (harmless; drop in a later migration once stable, keeps rollback trivial)
- No module code, no `src/modules/*` (modular plan phase 1 creates them)

## Decisions (anh confirms)
1. **Kysely over Drizzle/Prisma/TypeORM/raw `pg`** (reasons in Overview).
2. **One migration tracking table per source**: `platform` now (`src/db/migrations/`, table `platform_migration`), later one per module (`src/modules/<m>/migrations/`, table `<m>_migration`). Order across sources does not matter because cross-module FKs are banned. Removes modular plan decision 4 (file-name prefix convention).
3. **Port `create-user` in place** (same file name, Kysely format, idempotent `IF NOT EXISTS`) instead of a manual bookkeeping insert. This is the one deliberate exception to "never edit an applied migration": resulting schema is proven identical by schema diff (phase 2 validation).
4. **Own `MigrationProvider` using `require()`**, not Kysely's `FileMigrationProvider`: the latter uses native `import()`, which bypasses ts-node + tsconfig-paths, so `src/*` imports inside migrations would fail (same trap `sequelize-cli-config.cjs` documents).
5. **Table types hand-written per module** (`Generated<>`, `ColumnType<>`); platform code never holds a global DB type.
6. **CLI `enum` columns become `varchar + CHECK`**, not Postgres enum types (self-contained, easy to alter). Named PG enum types (roadmap phase 2 `common_status`, `credential_types`) stay hand-written with `sql`.

## Phases
| # | Phase | Status | Depends on |
|---|-------|--------|------------|
| 1 | [Connection layer: Kysely + pg pool](phase-01-connection-layer.md) | done | none |
| 2 | [Migrations: runner, CLI, blueprint, baseline](phase-02-migrations-runner-and-blueprint.md) | done (validated on scratch PG; dev DB not run) | 1 |
| 3 | [Cleanup, docs, dependent plans](phase-03-cleanup-docs-and-dependent-plans.md) | done | 2 |

One PR off `main` for all three (small), or one PR per phase if anh prefers; phase 1 alone keeps the app bootable because the Sequelize CLI is still there until phase 2 removes it.

## Ordering with other plans
`this plan` -> `modular plan phase 1` (registry exports migration sources instead of `initAllModels`) -> `roadmap phase 2` (identity module on Kysely).

## Risks
- Kysely is pre-1.0: minor versions can break APIs. Pin exact version (`kysely@0.29.8`), read changelog on upgrade
- No automatic `createdAt`/`updatedAt`: DB defaults cover insert, repositories must set `updatedAt` on update (helper in modular phase)
- No soft-delete/default scopes: tenant scope, `deletedAt IS NULL`, and secret-column exclusion become explicit repository helpers (translated in phase 3)
- Port of `create-user` drifts from the Sequelize-created schema: caught by schema diff before merge

## Rollback
Code: revert the PR. DB: only `platform_migration` + `platform_migration_lock` tables were added and `SequelizeMeta` was kept, so Sequelize CLI works again after revert; drop the two Kysely tables if wanted.

## Unresolved questions
- One PR or three?
- Keep `bignumber.js` dependency (no other import after phase 2) for future money math, or drop now?
- `datasource.master.dialect`: lock to `z.literal('postgres')` (proposed) or remove the field?
