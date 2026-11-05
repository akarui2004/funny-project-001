# Phase 1: Module Conventions, Registry, Boundary Test

## Context
- `src/http/create-http-app.ts` builds the app; comment already reserves a slot between `requestLogger` and `notFoundHandler` for health and the `api`/`ops`/`manager` surfaces (roadmap phase 1)
- `src/app/connections/database.ts` owns Sequelize; must not import modules (app layer stays below modules)
- `.sequelizerc` `models-path` = `src/db/models/` (empty), used only by `sequelize-cli model:generate`
- Tests: `node:test` via `tsx`, `tests/` mirrors `src/`

## Module layout
```text
src/modules/
  index.ts                     # registry: list of modules, initAllModels(sequelize)
  <module>/
    index.ts                   # PUBLIC surface, only file other code may import
    <module>.contract.ts       # DTO types + <Module>Api type = the bridge contract
    <module>.api.ts            # in-process implementation of the contract
    <module>.service.ts        # business logic (private)
    <module>.schema.ts         # zod request schemas (private)
    models/*.ts                # Sequelize models + init<Module>Models(sequelize) (private)
    routes/<surface>.route.ts  # express routers per surface (private, exported via index)
```

`index.ts` exports exactly:
```ts
export type * from './<module>.contract';
export { <module>Api } from './<module>.api';           // typed as <Module>Api
export { init<Module>Models } from './models';
export const <module>Routers = { api?, ops?, manager? }; // only the surfaces it serves
```

Contract rules:
- Every method returns `Promise<...>` even in-process
- Inputs/outputs are plain JSON-safe DTOs (ids as string UUID, dates as ISO string). Never a Sequelize instance
- Not found -> `null`; caller decides 404. Unexpected errors propagate
- Tenant-scoped methods take `tenantId` as the first argument explicitly

## Wiring
- `src/modules/index.ts`: `initAllModels(sequelize)` calls each `init<Module>Models`; exports routers by surface
- `src/server.ts`: after `appDb.initialize('master')`, call `initAllModels(appDb.getDb())`
- Surface routers (roadmap phase 1 `src/http/surfaces/<surface>/<surface>.router.ts`) mount module routers from `src/modules`
- Migration names: `<ts>-<module>-<action>.ts`; add optional `--module <name>` to `scripts/db/migration-cli.ts` that prefixes the file name (+ unit test in existing parser/renderer style if logic branches)

## Boundary test
`tests/modules/module-boundaries.test.ts` scans `src/**/*.ts` import specifiers (regex on `from '...'` and `import('...')`), resolves `src/...` alias and relative paths, and fails when:
1. A file in `src/modules/A/` imports `src/modules/B/<anything>` (B != A); only `src/modules/B` (index) allowed
2. A file outside `src/modules/` imports `src/modules/X/<anything>`; only `src/modules` or `src/modules/X` allowed
3. `src/app/**`, `src/utils/**`, `src/constants/**`, `src/helpers/**` import `src/modules` at all (platform stays below modules)
Failure message lists `file -> import`. Include a fixture-free self-check: the scanner function is exported from a small helper (`tests/modules/collect-imports.ts`) and unit-tested on inline strings.

## Docs
- `docs/code-standards.md`: module rules (contract, DTO, no cross-module FK/JOIN/transaction/raw SQL on another module's tables)
- `docs/architecture/project-structure.md`: `src/modules` in tree + diagram (platform -> modules -> http surfaces)
- `docs/agent-context.md`: entry point line for `src/modules/index.ts` and the boundary test

## Steps
1. Create `src/modules/index.ts` with empty registry (`initAllModels` no-op loop over empty list is fine; no placeholder module)
2. Wire `initAllModels` in `src/server.ts`
3. Boundary test + import collector + its unit test
4. `--module` option on migration CLI
5. Docs

## Todo
- [ ] registry + server wiring
- [ ] boundary test
- [ ] migration CLI `--module`
- [ ] docs

## Validation
- `yarn build`, `yarn test` green
- Temporarily add `import x from 'src/modules/a/a.service'` inside a scratch `src/modules/b/` file: test fails naming the line; remove
- `yarn db:migration:create products --module product` -> `<ts>-product-create-products.ts`

## Risks
- Regex import scan misses exotic forms (`require` with variables); acceptable, codebase uses static ESM imports
- Registry is a manual list; forgetting to register a module = its models not initialised, fails loudly on first query
