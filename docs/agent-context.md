# Agent Context

This file is the canonical project context for AI coding assistants. Keep it
short and update it when a repeated mistake or an important project decision
is discovered. Source code and the existing documentation remain authoritative
for implementation details.

## Project Rules

- Use Yarn commands because the repository includes `yarn.lock`.
- Read `README.md` and the configuration docs before changing configuration,
  database access (Kysely), migrations, or startup code.
- Do not read, print, or commit `.env`; use `.env.example` for the documented
  environment-variable contract.
- Do not edit an existing migration that may already have been applied. Add a
  new migration in `src/db/migrations/` instead. (Single exception, already done:
  `create-user` was ported from Sequelize to Kysely with an identical schema.)
- Keep local secrets and machine-specific overrides in ignored files such as
  `.env` or `config/<environment>.local.toml`.
- Preserve the `src/*` TypeScript path alias and run the build after source
  changes.
- Follow [`docs/code-standards.md`](code-standards.md) for coding conventions.
- Put tests in `tests/` mirroring `src/` (`src/a/b.ts` → `tests/a/b.test.ts`),
  import via the `src/...` alias, one `describe` per function/class and one
  `it` per behavior. Unit-test parsers, validators, security rules, error
  mapping, and branching helpers; skip startup, barrels, types, and code that
  needs a real DB/Redis. See the Testing section of `docs/code-standards.md`.

## Entry Points And Owners

- Application startup: `src/server.ts`
- Runtime configuration: `src/app/config-loader/index.ts`
- Configuration schemas: `src/app/config-loader/schema/`
- Runtime database connections: `src/app/connections/database.ts`
  (Kysely over `pg`; `appDb.getDb<DB>()` throws if not initialized, like
  `appRedis.getClient()`); TOML -> pool mapping in `build-pg-pool-config.ts`
- Runtime Redis connections: `src/app/connections/redis.ts`
- Migration runner and CLI: `src/db/migration-runner.ts` (migration sources,
  `require()`-based provider) and `scripts/db/migrate-cli.ts` (`yarn db:migrate*`).
  See [`docs/database/kysely-and-migrations.md`](database/kysely-and-migrations.md)
- Database migrations: `src/db/migrations/`
- Migration column conventions (`primaryKey`, `timestamps`, `softDelete`, `oneOf`, `nonNegative`): `src/db/migration-blueprint.ts`
- Directory layout and module dependency diagram: [`docs/architecture/project-structure.md`](architecture/project-structure.md)
- System, file, request, auth and data-model diagrams: [`docs/architecture/system-diagrams.md`](architecture/system-diagrams.md)
- Project root resolver (`.app_root` marker): `src/utils/resolve-project-root.ts`;
  import it directly, not via the `src/utils` barrel (circular with the logger)
- Logging: `src/utils/logger.ts` and `src/constants/logging.ts`; use
  `createModuleLogger('<module>')` so lines are tagged, not `console.log`.
  Configured by `LOG_*` env vars, not TOML (the logger exists before config loads)

## Configuration Contract

Runtime TOML files are merged in this order:

```text
config/base.toml -> config/<NODE_ENV>.toml -> config/<NODE_ENV>.local.toml
```

The runtime loader validates `env`, `datasource.master`, `redis.master`, and
`redis.queue` with Zod. The migration CLI reuses that loader through `appDb`
and connects with `datasource.master`. See `docs/setup/configuration.md` and
`docs/database/kysely-and-migrations.md` for the full contract.

## Verification

Run these commands after relevant changes:

```bash
yarn build
yarn test
yarn db:migrate
```

Only run `yarn db:migrate` when the intended PostgreSQL environment is
available and the migration change is intentional. Run `yarn test`
(`node:test` via `tsx`) for touched code that has tests; do not claim tests
passed based on the build.

## Known Repository Caveats

- `src/server.ts` currently exposes no HTTP routes.
- Startup requires reachable PostgreSQL and both Redis instances.
- `yarn db:migration:create <name> [--module <m>]` (`scripts/db/migration-cli.ts`) only creates an empty timestamped file; write the body by hand with Kysely.
- No seeders exist yet; there are no models (Kysely rows are plain objects).
- `kysely` 0.29 is ESM-only; the CommonJS build loads it through Node's
  `require(esm)` (Node >= 22.12, see `.nvmrc`), and `tsconfig.json` uses
  `module: node20` so TypeScript accepts it.
