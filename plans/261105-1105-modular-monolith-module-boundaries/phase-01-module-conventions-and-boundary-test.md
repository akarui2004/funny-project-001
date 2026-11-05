# Phase 1: Module Conventions, Registry, Boundary Test

## Context
- `src/http/create-http-app.ts` builds the app; comment already reserves a slot between `requestLogger` and `notFoundHandler` for health and the `api`/`ops`/`manager` surfaces (roadmap phase 1)
- `src/app/connections/database.ts` owns the Kysely pool (`appDb.getDb<DB>()`); must not import modules (app layer stays below modules)
- `src/db/migration-runner.ts`: `MigrationSource`, `MIGRATION_SOURCES` (only `platform` today); `scripts/db/migrate-cli.ts` runs every source
- Tests: `node:test` via `tsx`, `tests/` mirrors `src/`

## Module layout
```text
src/modules/
  index.ts                     # registry: list of modules, MODULE_MIGRATION_SOURCES, routers
  <module>/
    index.ts                   # PUBLIC surface, only file other code may import
    <module>.contract.ts       # DTO types + <Module>Api type = the bridge contract
    <module>.api.ts            # in-process implementation of the contract
    <module>.service.ts        # business logic (private)
    <module>.schema.ts         # zod request schemas (private)
    <module>.tables.ts         # Kysely table interfaces (Generated<>, ColumnType<>) (private)
    <module>.repository.ts     # queries via appDb.getDb<ModuleTables>() (private)
    migrations/*.ts            # migrations owned by this module
    routes/<surface>.route.ts  # express routers per surface (private, exported via index)
```

`index.ts` exports exactly:
```ts
export type * from './<module>.contract';
export { <module>Api } from './<module>.api';           // typed as <Module>Api
export const <module>MigrationSource: MigrationSource = { name: '<module>', folder: path.resolve(__dirname, 'migrations') };
export const <module>Routers = { api?, ops?, manager? }; // only the surfaces it serves
```

Contract rules:
- Every method returns `Promise<...>` even in-process
- Inputs/outputs are plain JSON-safe DTOs (ids as string UUID, dates as ISO string). Never a raw DB row with secret or internal columns
- Not found -> `null`; caller decides 404. Unexpected errors propagate
- Tenant-scoped methods take `tenantId` as the first argument explicitly

## Wiring
- `src/modules/index.ts`: exports `MODULE_MIGRATION_SOURCES` (each module's `<module>MigrationSource`) and routers by surface
- `src/db/migration-runner.ts` `MIGRATION_SOURCES` = `[PLATFORM_MIGRATION_SOURCE, ...MODULE_MIGRATION_SOURCES]`. Platform must not import modules, so either move the list into `scripts/db/migrate-cli.ts` (scripts may import both) or let the CLI concat them; prefer the CLI
- No model init at startup: Kysely has no models; a repository calls `appDb.getDb<ModuleTables>()` per query
- Surface routers (roadmap phase 1 `src/http/surfaces/<surface>/<surface>.router.ts`) mount module routers from `src/modules`
- Migration CLI: add optional `--module <name>` to `scripts/db/migration-cli.ts`; it writes to `src/modules/<name>/migrations/` instead of `src/db/migrations/` (unknown module folder -> error)

## Boundary test
`tests/modules/module-boundaries.test.ts` scans `src/**/*.ts` import specifiers (regex on `from '...'` and `import('...')`), resolves `src/...` alias and relative paths, and fails when:
1. A file in `src/modules/A/` imports `src/modules/B/<anything>` (B != A); only `src/modules/B` (index) allowed. This also blocks using another module's tables: they are typed in its private `<module>.tables.ts`, and `getDb<OtherTables>()` needs that import
2. A file outside `src/modules/` imports `src/modules/X/<anything>`; only `src/modules` or `src/modules/X` allowed
3. `src/app/**`, `src/utils/**`, `src/constants/**`, `src/helpers/**` import `src/modules` at all (platform stays below modules)
Failure message lists `file -> import`. Include a fixture-free self-check: the scanner function is exported from a small helper (`tests/modules/collect-imports.ts`) and unit-tested on inline strings.

## Docs
- `docs/code-standards.md`: module rules (contract, DTO, no cross-module FK/JOIN/transaction/raw SQL on another module's tables)
- `docs/architecture/project-structure.md`: `src/modules` in tree + diagram (platform -> modules -> http surfaces)
- `docs/agent-context.md`: entry point line for `src/modules/index.ts` and the boundary test

## Steps
1. Create `src/modules/index.ts` with empty registry (`MODULE_MIGRATION_SOURCES = []`; no placeholder module)
2. `migrate-cli` runs platform + module sources
3. Boundary test + import collector + its unit test
4. `--module` option on migration CLI
5. Docs

## Todo
- [ ] registry + server wiring
- [ ] boundary test
- [x] migration CLI `--module` (done 2026-11-05, CLI now creates empty files only)
- [ ] docs

## Validation
- `yarn build`, `yarn test` green
- Temporarily add `import x from 'src/modules/a/a.service'` inside a scratch `src/modules/b/` file: test fails naming the line; remove
- `yarn db:migration:create create-products --module product` -> `src/modules/product/migrations/<ts>-create-products.ts`; `yarn db:migrate` creates `product_migration`

## Risks
- Regex import scan misses exotic forms (`require` with variables); acceptable, codebase uses static ESM imports
- Registry is a manual list; forgetting to register a module = its migrations never run, first query fails with `relation does not exist`
