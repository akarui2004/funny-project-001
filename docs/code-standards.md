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

Conventions already used in the codebase; follow them for new code:

| Thing | Convention | Example |
|-------|-----------|---------|
| Folder | kebab-case | `config-loader/` |
| Module file | kebab-case `.ts` | `resolve-project-root.ts` |
| Zod schema file | `<name>.schema.ts` | `redis.schema.ts` |
| Type-only file | `<name>.type.ts` | `config.type.ts` |
| Folder public API | `index.ts` barrel re-exports | `src/constants/index.ts` |
| Migration file | `YYYYMMDDHHmmss-<verb>-<noun>.ts`, created via `yarn db:migration:create <verb>-<noun>` | `20260724075029-create-user.ts` |
| Zod schema constant | `UPPER_SNAKE_CASE` + `_SCHEMA` | `REDIS_SCHEMA` |
| Type inferred from a schema | `T` prefix + PascalCase | `TRedisSchema` |
| Interface / class | PascalCase, no `I` prefix | `ParsedField`, `MigrationColumnParser` |
| Constant group object | `UPPER_SNAKE_CASE` | `DEFAULTS`, `LOGGING` |
| Managed singleton | `app` + PascalCase noun | `appDb`, `appRedis`, `appConfig` |
| Function | camelCase verb phrase, `export const` arrow | `buildPgPoolConfig`, `createModuleLogger` |
| Module logger tag | short lowercase name | `createModuleLogger('db')` |

## Formatting

- 2-space indentation, semicolons, single quotes (template literals for
  interpolation). No formatter is configured; VS Code's built-in TypeScript
  formatter runs on save (`.vscode/settings.json`).
- Comments explain *why* (intent, invariants, cross-file coupling), not what
  the next line does.

## Configuration

- Add configuration fields to the TOML schema in
  `src/app/config-loader/schema/` before consuming them in application code.
- Keep parsing and validation at the configuration boundary. Application
  modules should consume typed config rather than reading `process.env`
  directly.
- Keep secrets in `.env` or ignored `config/<environment>.local.toml` files.
  Never place credentials in committed TOML, source, logs, or documentation.
- Preserve the merge order `base -> environment -> environment.local`.
- The migration CLI connects through `appDb`, like the app; change connection
  options in `buildPgPoolConfig` (`src/app/connections/build-pg-pool-config.ts`)
  so both stay in sync.

## Express And Startup

- Keep `src/server.ts` responsible for composition and startup only. Put route
  handlers, application services, and domain logic in their own modules.
- Make startup dependencies explicit and await them before calling
  `app.listen`.
- Use the project logger for operational messages. Do not introduce ad-hoc
  logging in new application code unless it is temporary diagnostics.
- Add graceful shutdown handling when introducing long-lived resources or
  background workers. Close Redis clients and Kysely pools (`appDb.disconnectAll()`) before process exit.
- Convert route and service errors into intentional HTTP responses. Do not
  expose raw database, Redis, or credential details to clients.

## Database And Migrations

- Treat applied migrations as immutable. Create a new migration for schema
  changes and provide both `up` and `down` operations where rollback is safe.
- Use `primaryKey`, `timestamps`, `softDelete`, `oneOf`, and `nonNegative` from
  `src/db/migration-blueprint.ts` so key types, timestamps, and enum checks stay
  consistent. Never change what an existing helper emits; add a new one.
- Use UUID for every primary and foreign key. Never use auto-increment,
  serial, or bigint ids: they are guessable and allow enumeration.
- Keep migration names timestamped and describe the schema change clearly.
- Get the database as `appDb.getDb<Tables>()` with the caller's own table
  interface. `Kysely<any>` is allowed only in migrations.
- Return plain rows/DTOs. Select explicit columns from tables holding secrets
  (no `selectAll()` there).
- Every read on a soft-delete table filters `deletedAt is null`.
- Multi-step writes use `db.transaction().execute(async (trx) => ...)`; pass
  `trx` down and never mix `db` and `trx` inside one flow.
- Raw SQL only through the `sql` tagged template (parameterized); never
  concatenate values. `sql.raw` only for already-validated identifiers.
- Set `updatedAt` on every update; the DB default covers inserts only.

## Redis

- Initialize named clients through `appRedis.initialize()` and retrieve them
  through `appRedis.getClient()`. Do not construct unmanaged clients in feature
  modules.
- Use the configured Redis `keyPrefix` and stable, namespaced key names.
- Handle reconnect or command failures at the feature boundary when an
  operation is not safe to retry.
- Disconnect all clients during graceful shutdown.

## Testing

Tests use `node:test` run through `tsx` (`yarn test`). Place them in `tests/`,
mirroring the `src/` layout:

```text
src/helpers/match-ip-rules.ts                → tests/helpers/match-ip-rules.test.ts
src/utils/get-error-message.ts             → tests/utils/get-error-message.test.ts
src/http/errors/http-error.ts              → tests/http/errors/http-error.test.ts
src/http/middlewares/not-found-handler.ts  → tests/http/middlewares/not-found-handler.test.ts
```

- Name test files `<source-file-name>.test.ts` (kebab-case, same as the source).
- Import code under test through the `src/...` alias, never `../../src/...`.
- One `describe` per function or class; one `it` per behavior.

### Test Case Names

Start every `it` title with a lowercase keyword, then a short phrase or
sentence that qualifies it. Add the expected outcome after a comma when the
qualifier only states a condition.

| Keyword | Use for | Example |
|---------|---------|---------|
| `given` | Precondition or state | `given an IPv4-mapped IPv6 address, returns the IPv4 part` |
| `when` | Trigger or action | `when the header is missing, falls back to the socket address` |
| `with` / `without` | Input variant present or absent | `without details, omits the details field` |
| `for` | Category of input | `for loopback addresses, returns version 4` |
| `if` / `unless` | Conditional behavior | `unless a code is given, uses UNKNOWN_ERROR` |
| `while` | Behavior during an ongoing state | `while shutting down, rejects new connections` |
| `after` / `before` | Ordering | `after parsing, replaces request data in place` |
| `which` | Selection among alternatives | `which proxy hop wins when several are listed` |
| `why` | Reason behind a rule, usually a regression | `why a 5xx hides its message: avoids leaking internals` |
| `how` | Mechanism or format of the result | `how details are grouped by path` |

- Pick the keyword that matches the intent; do not start with a bare verb
  (`returns`, `throws`, `should`).
- Keep the title one line; no trailing period.

### What Needs Unit Tests

Unit-test a file when it has branching, parsing, or transformation logic **and**
runs without network, database, or Redis. Mock nothing heavier than an Express
`req`/`res`/`next` stub.

| Required | Why | Examples |
|----------|-----|----------|
| Parsers and validators | Many input shapes, easy to break silently | `src/helpers/match-ip-rules.ts`, `src/helpers/ip-helper/` |
| Security and access rules | A bug lets the wrong request through | `ip-allow-list.ts`, `ip-black-list.ts`, auth checks |
| Error to HTTP response mapping | Response contract; must not leak internals on 5xx | `error-handler.ts`, `http-error.ts`, `validate-request.ts` |
| Pure helpers with branches | Cheap to test, reused widely | `src/utils/get-error-message.ts` |
| Mappings shared by two consumers | Drift breaks both sides | `buildPgPoolConfig` |
| Custom Zod rules | Only rules beyond plain shape (`min`, `regex`, `refine`) | `http.schema.ts` limits |
| Migration blueprint helpers | Emitted DDL must never drift (history replays it) | `tests/db/migration-blueprint.test.ts` |
| Business logic in services | Core behavior; add as services are written | future `src/**/services/` |

Skip unit tests for:

- Composition and startup (`src/server.ts`), barrels (`index.ts`), `*.type.ts`,
  and constants.
- Connection managers (`src/app/connections/`) and migrations; they need real
  PostgreSQL/Redis and belong in integration tests.
- Trivial one-liners and thin wrappers over a library (`logger.ts`,
  `not-found-handler.ts`) unless they gain logic.

A bug fix in a covered file adds an `it` that fails without the fix.

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

Run `yarn test` when tests exist for the touched code. There is no
formatter/linter; do not claim lint or formatting checks passed.
