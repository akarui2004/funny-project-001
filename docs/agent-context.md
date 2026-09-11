# Agent Context

This file is the canonical project context for AI coding assistants. Keep it
short and update it when a repeated mistake or an important project decision
is discovered. Source code and the existing documentation remain authoritative
for implementation details.

## Project Rules

- Use Yarn commands because the repository includes `yarn.lock`.
- Read `README.md` and the configuration docs before changing configuration,
  Sequelize, migrations, or startup code.
- Do not read, print, or commit `.env`; use `.env.example` for the documented
  environment-variable contract.
- Do not edit an existing migration that may already have been applied. Add a
  new migration in `src/db/migrations/` instead.
- Keep local secrets and machine-specific overrides in ignored files such as
  `.env` or `config/<environment>.local.toml`.
- Preserve the `src/*` TypeScript path alias and run the build after source
  changes.
- Follow [`docs/code-standards.md`](code-standards.md) for coding conventions.

## Entry Points And Owners

- Application startup: `src/server.ts`
- Runtime configuration: `src/app/config/index.ts`
- Configuration schemas: `src/app/config/schema/`
- Runtime database connections: `src/app/settings/database.ts`
- Runtime Redis connections: `src/app/settings/redis.ts`
- Sequelize CLI configuration: `.sequelizerc` and `src/config/database.mts`
- Database migrations: `src/db/migrations/`
- Shared migration column helpers: `src/utils/migration/blueprint.ts`
- Logging: `src/utils/logger.ts` and `src/constants/logging.ts`

## Configuration Contract

Runtime TOML files are merged in this order:

```text
config/base.toml -> config/<NODE_ENV>.toml -> config/<NODE_ENV>.local.toml
```

The runtime loader validates `env`, `datasource.master`, `redis.master`, and
`redis.queue` with Zod. The Sequelize CLI loader reads only
`datasource.master`. See `docs/configuration.md` and
`docs/database-config-loader.md` for the full contract.

## Verification

Run these commands after relevant changes:

```bash
yarn build
yarn db:migrate
```

Only run `yarn db:migrate` when the intended PostgreSQL environment is
available and the migration change is intentional. There is no configured
automated test suite currently; do not claim tests passed based on the build.

## Known Repository Caveats

- `src/server.ts` currently exposes no HTTP routes.
- Startup requires reachable PostgreSQL and both Redis instances.
- `scripts/db/genMigration.ts` is currently a placeholder.
- `INSTALLATION.md` contains older paths and logging references; prefer the
  current source, `package.json`, and the `docs/` configuration guides.
- TOML logging settings described in `docs/configuration.md` are not currently
  consumed by the logger; runtime logging uses `LOG_*` environment variables.
