# Phase 4: Test Setup (anh does it; prepared steps)

## Context
`tests/` empty (`.gitkeep`). `tsconfig.json` includes only `src/**` and `config/**`, so tests are not type-checked by `yarn build`. `docs/agent-context.md` says no test suite exists. Config loader requires `config/base.toml` and `config/<NODE_ENV>.toml`.

## Requirements
- vitest, `yarn test`, `src/*` and `scripts/*` aliases work
- Unit tests need no DB/Redis
- Integration tests (need Postgres) separate, optional

## Steps
1. `yarn add -D vitest supertest @types/supertest`
2. `vitest.config.ts`: `test.include = ['tests/**/*.test.ts']`; `resolve.alias = { src: path.resolve('src'), scripts: path.resolve('scripts') }`
3. `package.json`: `"test": "vitest run"`, `"test:watch": "vitest"`
4. `tests/tsconfig.json` extending root, `include: ["./**/*", "../src/**/*", "../scripts/**/*"]` (editor type-check only)
5. First tests, in this order (most branching first):
   - `tests/scripts/db/helpers/migration-column-parser.test.ts`
   - `tests/scripts/db/helpers/migration-column-renderer.test.ts`
   - `tests/utils/resolve-project-root.test.ts` (temp dir with `.app_root`)
   - `tests/app/connections/build-sequelize-options.test.ts`
   - after phase 1: `tests/http/*.test.ts` with supertest against `createHttpApp({ readinessChecks: stubs })` (no listen, no DB)
   - after phase 1: `tests/http/auth/access-token-service.test.ts` (expired, tampered, `alg: none`, wrong `iss`/`aud`) and `authenticate.test.ts` (wrong `aud` -> 403, denylisted jti/user/tenant -> 401; use an in-memory stub of the revocation store interface, set a test `JWT_SECRET` in the test env)
   - after phase 2: `tests/utils/password-hasher.test.ts` (round trip, wrong password, tampered hash) and `api-key-generator.test.ts` (format, hash compare, wrong secret)
   - after phase 2, integration: orphan check (no active credential whose `targetId` row is missing or soft-deleted, per `targetType`), CHECK constraints on `credentials`
   - after phase 2, integration (needs Postgres): cross-tenant tests, tenant A token on tenant B user id -> 404, suspended tenant -> 401. These guard the most dangerous failure of the design
6. Config loader tests: need `NODE_ENV=test` and `config/test.toml`, or a loader that accepts a dir. Simplest: add `config/test.toml` with dummy values (no secrets)
7. Update `docs/agent-context.md` Verification section with `yarn test`

## Validation
`yarn test` green. Break a parser rule on purpose: the test fails.

## Risks
- Alias mismatch between vitest and the `tsc-alias` build: keep the `src/*` form identical
- Importing `src/app` in a test triggers config load and connections: test through the injected factory instead
