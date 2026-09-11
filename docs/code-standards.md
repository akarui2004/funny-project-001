# Code Standards

These conventions apply to application code, configuration loaders, database
code, and scripts. The compiler and existing source are the authority where
this document is silent.

## TypeScript

- Keep `strict` type checking enabled. Do not weaken `tsconfig.json` to bypass
  an error.
- Avoid `any`. Use an explicit type, `unknown` with narrowing, or a library
  type. Error values in `catch` blocks should be narrowed before use.
- Prefer inferred types for local variables and explicit types for exported
  functions, public methods, configuration contracts, and module boundaries.
- Use the `src/*` path alias for imports that cross application boundaries.
  Relative imports are appropriate within a small local module boundary.
- Use `import type` when an imported symbol is type-only.
- Prefer `async`/`await` for asynchronous control flow. Always await database,
  Redis, filesystem, and server lifecycle operations that can fail.
- Keep functions focused. Extract a helper when it has an independent
  responsibility or is reused.

## Naming And Files

- Use `camelCase` for variables, functions, parameters, and object properties.
- Use `PascalCase` for classes, interfaces, and type aliases.
- Use `UPPER_SNAKE_CASE` only for module-level constants that are genuinely
  constant values or schemas.
- Use descriptive kebab-case filenames for new standalone modules. Preserve
  established filenames when modifying existing modules.
- Name configuration keys after the library or protocol expects them. Convert
  application names to library-specific names at the integration boundary.

## Configuration

- Add configuration fields to the TOML schema in
  `src/app/config/schema/` before consuming them in application code.
- Keep parsing and validation at the configuration boundary. Application
  modules should consume typed config rather than reading `process.env`
  directly.
- Keep secrets in `.env` or ignored `config/<environment>.local.toml` files.
  Never place credentials in committed TOML, source, logs, or documentation.
- Preserve the merge order `base -> environment -> environment.local`.
- When changing Sequelize CLI configuration, update both
  `src/config/database.mts` and the related configuration documentation.

## Express And Startup

- Keep `src/server.ts` responsible for composition and startup only. Put route
  handlers, application services, and domain logic in their own modules.
- Make startup dependencies explicit and await them before calling
  `app.listen`.
- Use the project logger for operational messages. Do not introduce ad-hoc
  logging in new application code unless it is temporary diagnostics.
- Add graceful shutdown handling when introducing long-lived resources or
  background workers. Close Redis and Sequelize clients before process exit.
- Convert route and service errors into intentional HTTP responses. Do not
  expose raw database, Redis, or credential details to clients.

## Sequelize And Migrations

- Treat applied migrations as immutable. Create a new migration for schema
  changes and provide both `up` and `down` operations where rollback is safe.
- Reuse helpers from `src/utils/migration/blueprint.ts` for common columns so
  nullability, timestamps, and key types remain consistent.
- Keep migration names timestamped and describe the schema change clearly.
- Do not use `sync({ alter: true })` or `sync({ force: true })` as a substitute
  for migrations.
- Keep transaction boundaries explicit for multi-step data changes.
- Keep models, migrations, and database configuration aligned.

## Redis

- Initialize named clients through `appRedis.initialize()` and retrieve them
  through `appRedis.getClient()`. Do not construct unmanaged clients in feature
  modules.
- Use the configured Redis `keyPrefix` and stable, namespaced key names.
- Handle reconnect or command failures at the feature boundary when an
  operation is not safe to retry.
- Disconnect all clients during graceful shutdown.

## Verification

Before reporting a change complete:

```bash
yarn build
```

Run database migrations only when PostgreSQL is available and the migration is
intended for that environment:

```bash
yarn db:migrate
```

There is currently no configured automated test suite or formatter/linter.
Avoid claiming tests, lint, or formatting checks passed unless such tooling is
added and actually run.
