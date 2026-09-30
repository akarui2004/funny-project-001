# Phase 2: Multi-Tenant Identity, Credentials, Login, Resources (priority 2)

## Context
- Decisions: UUID v4 ids (PostgreSQL >= 16, `gen_random_uuid()` built in). Shared schema with `tenantId`. Tenant = ops. Identity model from anh's schema: `tenants`, `operators`, `users`, `credentials` (polymorphic `targetId`/`targetType`), plus a separate `managers` table.
- Surfaces map to people: `manager` -> Manager, `ops` -> Operator, `api` -> User.
- `src/db/models/`, `src/db/seeders/` empty (`.sequelizerc` points at both).
- `primaryKey()` in `src/db/migration-blueprint.ts` has UUID type but **no default**; `uuid()` ignores its `unique` param. The `create-user` migration is applied and immutable.
- Existing `users` table: `id, username, password, role, deletedAt, createdAt, updatedAt`. New `users` shape differs; migration guards against existing rows (see Steps).
- `seeder:create` script was removed; seeders have no run tracking by default.

## Data model
Enums (Postgres types): `common_status` = `active | suspended`; `credential_types` = `password | key-based | totp`.

| Table | Columns | Notes |
|-------|---------|-------|
| `tenants` | `id`, `name`, `slug`, `status`, `deletedAt`, `createdAt`, `updatedAt` | partial unique `lower(slug)` where `deletedAt IS NULL`; slug `^[a-z0-9-]{3,50}$` |
| `managers` | `id`, `name`, `birthDate?`, `bio?`, `deletedAt`, timestamps | platform staff, no tenant |
| `operators` | `id`, `tenantId` NOT NULL FK, `name`, `birthDate?`, `bio?`, `deletedAt`, timestamps | ops admins of one tenant |
| `users` | `id`, `tenantId` NOT NULL FK, `name`, `address`, `phone`, `birthDate?`, `bio?`, `deletedAt`, timestamps | end users; `address`, `phone` NOT NULL as in the design |
| `credentials` | `id`, `tenantId?`, `accessKey`, `secret`, `type`, `targetId`, `targetType`, `status`, `deletedAt`, timestamps | polymorphic link, see constraints |

Additions to anh's schema (flag if unwanted): `deletedAt` on `operators`, `users`, `managers` (soft delete; a hard delete would leave orphan credentials), `managers` table, `tenantId` on `users`/`operators`.

### `credentials` constraints
- `CHECK (targetType IN ('User','Operator','Manager'))`
- `CHECK ((targetType = 'Manager') = (tenantId IS NULL))`: manager credentials have no tenant, everyone else must
- Partial unique `(tenantId, lower(accessKey))` where `deletedAt IS NULL AND tenantId IS NOT NULL`; partial unique `lower(accessKey)` where `deletedAt IS NULL AND tenantId IS NULL`
- Partial unique `(targetType, targetId)` where `type='password' AND deletedAt IS NULL` (one active password per person; many `key-based` allowed)
- Index `(targetType, targetId)`
- `tenantId` FK to `tenants(id)` ON DELETE RESTRICT
- Polymorphic `targetId` has **no database foreign key** (Postgres cannot). Integrity is kept by: soft delete only, deleting a person and their credentials in one transaction, CHECKs above, and an orphan-check integration test (phase 4)

### Meaning of `accessKey` / `secret` by type
| type | accessKey | secret (stored) |
|------|-----------|-----------------|
| `password` | login name chosen by the person (unique per tenant) | scrypt hash `scrypt$N$r$p$salt$hash` |
| `key-based` | generated public id `ak_<16 random bytes base64url>` | SHA-256 of generated `sk_<32 random bytes base64url>` (high entropy, fast hash is enough); plaintext shown **once** at creation |
| `totp` | deferred | deferred (needs reversible encryption of the seed) |

## Requirements
- Base model + `Tenant`, `Manager`, `Operator`, `User`, `Credential`; soft delete; camelCase columns (no `underscored`)
- `TenantScopedModel` base (`tenantId` + `forTenant(tenantId)` scope) for `Operator`, `User`; `Credential.forTenant` likewise. Every tenant-owned query takes `tenantId` from `req.auth`, never from body/params/query
- Login on the three surfaces returns `{ accessToken, refreshToken, expiresIn }`; refresh rotates the pair
- Credential types in this phase: `password`, `key-based`. `totp` exists in the enum only, flow deferred
- Seeder CLI, manager bootstrap CLI

## Login flow
`POST /manager/v1/auth/login` `{accessKey, secret}` ; `POST /ops/v1/auth/login` and `POST /api/v1/auth/login` `{tenantSlug, accessKey, secret}`.
1. Validate body. ops/api: find tenant by `lower(slug)`, `status=active`, not deleted
2. Find credential by `(tenantId, lower(accessKey))` (`tenantId IS NULL` for manager), `status=active`, not deleted, `targetType` matches the surface (manager->Manager, ops->Operator, api->User), type allowed on the surface: `password` everywhere; `key-based` on `ops` and `api` only
3. Verify `secret` by type (scrypt `timingSafeEqual`, or SHA-256 compare `timingSafeEqual`)
4. Load the target row, must exist and not be deleted
5. Issue tokens (phase 1): `sub=targetId`, `aud=surface`, `tid=tenantId` (absent for manager), `cid=credentialId`, `jti`. No `role` claim
Any failure in 1 to 4 -> the same 401 body; when nothing matched, still run a dummy hash verify so timing does not reveal what failed.
Refresh re-checks tenant active, credential active, target not deleted.

## Endpoints
| Surface | Endpoint | Rule |
|---------|----------|------|
| manager | `POST /manager/v1/tenants` `{name,slug,operator:{name,accessKey,password}}` | one transaction: tenant + first operator + its `password` credential; 409 on duplicate slug |
| manager | `GET /tenants`, `GET /tenants/:id`, `PATCH /tenants/:id` (name) | paginated, `limit` max 100 |
| manager | `POST /tenants/:id/suspend` \| `/activate` | suspend = status + denylist `tenant-suspended:<tid>` + delete its refresh tokens |
| ops | `POST /ops/v1/users` `{name,address,phone,birthDate?,bio?,credential:{accessKey,password}}` | user + password credential in one transaction, scoped to `req.auth.tenantId` |
| ops | `GET /users`, `GET /users/:id`, `PATCH /users/:id`, `DELETE /users/:id` | delete = soft delete person + credentials, revoke their tokens |
| ops | `PUT /users/:id/password` | reset password, revoke that credential's refresh tokens |
| ops | `POST /users/:id/credentials` `{type:'key-based'}` | returns `accessKey` + `secret` once |
| ops | `POST /credentials/:cid/suspend` \| `/activate`, `DELETE /credentials/:cid` | scoped to tenant; suspend/delete revoke the credential's tokens |
| ops | `POST /ops/v1/operators`, `GET /operators`, `DELETE /operators/:id` | cannot delete self or the last active operator of the tenant |
| api | `GET /api/v1/me`, `PUT /api/v1/me/password` | own profile; change password needs the current one |
| all | `POST .../auth/refresh` `{refreshToken}` | rotation; unknown/used token -> 401 |
| all | `POST .../auth/logout` `{refreshToken}` | delete refresh token + `revoked-jti` for the presented access token |
| all | `GET .../auth/me` | returns `req.auth` |

Phase 1 change implied here: `authenticate` denylist checks `revoked-jti:<jti>`, `credential-revoked:<cid>`, `tenant-suspended:<tid>` (replaces `user-revoked:<sub>`); refresh index set is `credential-refresh:<cid>`. Updated in phase 1 file.

## Files
```text
src/db/models/{base-model,tenant-scoped-model,tenant,manager,operator,user,credential}.ts, index.ts
src/db/migrations/<ts>-add-uuid-default-to-users-id.ts
src/db/migrations/<ts>-create-common-status-and-credential-types.ts
src/db/migrations/<ts>-create-tenants.ts
src/db/migrations/<ts>-create-managers.ts
src/db/migrations/<ts>-create-operators.ts
src/db/migrations/<ts>-rework-users-for-tenants.ts
src/db/migrations/<ts>-create-credentials.ts
src/db/migration-blueprint.ts          # uuidPrimaryKey(); fix uuid() unique
src/utils/password-hasher.ts           # scrypt hash/verify
src/utils/api-key-generator.ts         # generate ak_/sk_ pair, hash secret, compare
src/modules/auth/{auth.service.ts,auth.schema.ts}
src/modules/tenant/{tenant.service.ts,tenant.schema.ts}
src/modules/user/{user.service.ts,user.schema.ts}
src/modules/operator/{operator.service.ts,operator.schema.ts}
src/modules/credential/{credential.service.ts,credential.schema.ts}
src/http/surfaces/manager/{auth,tenant}.route.ts
src/http/surfaces/ops/{auth,user,operator,credential}.route.ts
src/http/surfaces/api/{auth,me}.route.ts
scripts/db/seeder-cli.ts + template/seeder.mustache
scripts/db/create-manager-cli.ts       # yarn db:manager:create --name x --access-key y --password-stdin
src/app/connections/database.ts        # initModels after authenticate
package.json                           # db:seeder:create, db:manager:create
```
Do not change old `primaryKey()` behavior (fresh runs of applied migrations would drift). New tables use `uuidPrimaryKey()` with `defaultValue: Sequelize.literal('gen_random_uuid()')`; models also set `DataTypes.UUIDV4`.

## Steps
1. **Back up DB** (`pg_dump`), then `SELECT count(*) FROM users`
2. Blueprint: `uuidPrimaryKey()`, fix `uuid()`
3. Migration: `users.id` default `gen_random_uuid()`
4. Migration: `CREATE TYPE common_status`, `credential_types` (`down` drops them)
5. Migrations: `tenants`, `managers`, `operators` (partial unique / indexes via raw SQL, `down` reverses)
6. Migration `rework-users-for-tenants`, one transaction: **abort with a clear message if `users` has rows** (old `password` format is unknown, cannot be migrated safely; anh decides what to do with dev data); otherwise drop `username`, `password`, `role`, add `tenantId` FK, `name`, `address`, `phone`, `birthDate`, `bio`. `down` restores the old columns (nullable) and drops the new ones
7. Migration `credentials` with all constraints above
8. Models and `initModels` registration
9. `password-hasher.ts`, `api-key-generator.ts`
10. Modules and routes per table above, wired to phase 1 guards
11. Seeder CLI (ids via `randomUUID()` from `node:crypto`, `seederStorage: 'sequelize'` in `sequelize-cli-config.cjs`, verify option name against installed sequelize-cli) and `db:manager:create` (password from stdin, never argv)
12. Docs: `code-standards.md` (tenant scoping + polymorphic rule), `agent-context.md`, `project-structure.md`, `configuration.md`; retire `docs/todos.md` items

## Security rules
- Same 401 for unknown tenant, unknown accessKey, wrong secret, suspended tenant/credential; dummy hash verify on miss
- Stricter login rate limit (e.g. 10/min keyed by IP + tenantSlug + accessKey)
- Cross-tenant id -> **404**, not 403
- `secret` never in any response or log, except the one-time key-based secret at creation. `Credential` `defaultScope` excludes `secret`; `scope('withSecret')` only inside `auth.service`
- Password min length 10; key-based secrets generated by the server only
- Suspending a tenant or credential, deleting a person: denylist + delete refresh tokens at once

## Todo
- [ ] backup + row count
- [ ] blueprint helper + fix
- [ ] enums + 5 table migrations + users rework
- [ ] models + tenant scoping base
- [ ] password hasher + api key generator
- [ ] auth module + 3 login routes + refresh/logout
- [ ] tenant, user, operator, credential modules and routes
- [ ] seeder CLI + manager bootstrap CLI
- [ ] docs

## Validation (scratch DB)
- `yarn db:migrate`, undo all new migrations, migrate again; with rows in `users`, step 6 aborts cleanly
- Raw `INSERT` into `tenants` without `id` yields a UUID v4
- CHECK guards: inserting a `Manager` credential with a `tenantId`, or a `User` credential without one, fails
- `yarn db:manager:create`, login on manager, create tenant `acme` with its operator, login on ops, create a user, login on api with `password`; issue a `key-based` credential and login with it
- Ops token of tenant A on tenant B's user id -> 404
- `api` token on `/ops/v1/*` -> 403; ops token on `/manager/v1/*` -> 403; `key-based` credential on manager login -> 401
- Suspend tenant: existing ops and api access tokens -> 401 at once, refresh -> 401, new login -> 401
- Suspend one credential: only its tokens die
- Refresh twice with the same refresh token: second -> 401; logout then reuse access token -> 401
- Same `accessKey` in two tenants OK; same `accessKey` (different case), same tenant -> 409
- Deleting a user leaves no active credential for it
- No response or log line contains a secret or hash
- `yarn db:seed:all` twice: second run inserts nothing

## Risks
- Polymorphic link has no FK (anh's choice): orphans possible if code bypasses the service. Mitigation above; all deletes are soft and transactional
- Any tenant-owned query missing `forTenant` leaks across tenants. Mitigation: access only via services requiring `tenantId`; cross-tenant tests in phase 4; later hardening: Postgres row-level security
- `users.address`/`phone` NOT NULL forces ops to collect them at creation
- Applied migrations are immutable; fixes only via new migrations
- Enum values cannot be removed once added; add new `credential_types` values with `ALTER TYPE ... ADD VALUE` in their own migration
- Optional later columns on `credentials`: `lastUsedAt`, `expiresAt`, `label` (useful for key-based); not added now
- totp later needs: encrypted seed (AES-256-GCM, key in `.env`), recovery codes, two-step login
