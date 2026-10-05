# Phase 1: HTTP Foundation, Three Surfaces, JWT Auth (priority 1)

## Context
- `src/server.ts` only does `express.json()` + `listen`, no routes. `helmet`, `cors`, `express-rate-limit` installed, unused. Express 5 (async handler errors reach error middleware).
- `docs/code-standards.md`: `server.ts` = composition only; intentional HTTP errors; never expose raw DB/Redis details; app modules consume typed config, secrets stay in `.env`. `catch (error: any)` (5 places) violates it.
- Decisions: multi-tenant, **one process, three routers** on one port. `api` = end users of a tenant, `ops` = admins of one tenant (tenant = ops), `manager` = platform admins over all ops. Tenant id comes from the signed JWT, never from client input. Shared schema + `tenant_id` (phase 2).
- Auth = **JWT access token (short) + opaque refresh token on Redis**. This phase needs no DB (JWT verify + Redis). Login and refresh endpoints land in phase 2 (they need tables).

## Requirements
- Testable app factory (no `listen` inside)
- `GET /health`, `GET /ready` (DB + both Redis)
- helmet, cors allow-list, rate limit, all config-driven
- Central errors, uniform JSON contract, Zod validation, UUID param validation
- Three surfaces at `/api/v1`, `/ops/v1`, `/manager/v1`, each with its own auth guard
- JWT access token verification pinned to HS256, checked `aud`; instant revoke through a Redis denylist
- Refresh token store with rotation
- Optional IP allow-list for `/manager` (stdlib `net.BlockList`, CIDR)
- No `any` in catch blocks

## Target layout
```text
src/http/
  create-http-app.ts           # builds express app; deps injected (readiness checks, token services)
  errors/http-error.ts         # HttpError(status, code, message, details?)
  middlewares/
    request-logger.ts          # createModuleLogger('http')
    not-found-handler.ts
    error-handler.ts
    validate-request.ts        # zod body/params/query -> 400
    ip-allow-list.ts           # CIDR list from config, empty = allow all
  auth/
    access-token-service.ts    # sign / verify JWT (jose, HS256)
    refresh-token-store.ts     # issue / rotate / revoke (Redis, hashed)
    revocation-store.ts        # denylist: jti, user, tenant (Redis, short TTL)
    authenticate.ts            # authenticate('api'|'ops'|'manager') -> req.auth
    auth-context.type.ts       # Express Request augmentation: req.auth
  surfaces/
    api/api.router.ts
    ops/ops.router.ts
    manager/manager.router.ts
  routes/health.route.ts
src/utils/get-error-message.ts
src/app/config-loader/schema/http.schema.ts
src/app/config-loader/schema/auth.schema.ts
```
Feature logic lives in `src/modules/<feature>/` (phase 2). Each surface router only wires routes to module services.

## Contracts
- Success `{ "data": ... }`; error `{ "error": { "code", "message", "details"? } }`. 5xx message always `Internal Server Error`, cause only in logs.
- Readiness 200 `{status:"ok"}`; 503 `{status:"unavailable", checks:{db,redis,queue}}` booleans only.
- Auth header `Authorization: Bearer <accessToken>`. Missing/invalid/expired/revoked -> 401 `UNAUTHENTICATED`; wrong surface or role -> 403 `FORBIDDEN`; Redis unreachable during revocation check -> 503 (fail closed).
- Malformed UUID path param -> 400 `INVALID_ID` (`z.uuid()`); unknown UUID -> 404.

## Token design
**Access token (JWT, HS256, library `jose`, no other dependency)**
- Claims: `sub` (user/operator/manager id), `aud` (`api|ops|manager`), `tid` (tenant id, absent for manager), `cid` (credential id used to log in), `jti` (uuid), `iss`, `iat`, `exp`. No `role` claim: surface (`aud`) is the only privilege level.
- TTL per surface (default 15 min). Verify with `algorithms: ['HS256']`, expected `issuer`, expected `audience`; never accept `alg: none`. `authenticate('ops')` rejects other audiences (403).
- Secret from `.env` `JWT_SECRET` (>= 32 chars), injected by the config loader into `auth.jwtSecret`, validated at startup (fail fast). Never in TOML, never logged.

**Refresh token (opaque, Redis)**
- `randomBytes(32).toString('base64url')`; Redis key `refresh:<sha256>` -> `{ sub, aud, tid?, cid }`, TTL per surface (api 30d, ops 7d, manager 1d). Only the hash is stored.
- Rotation: `POST .../auth/refresh` consumes the old token (delete) and issues a new pair. Unknown or already-used token -> 401.
- Index sets `tenant-refresh:<tid>` and `credential-refresh:<cid>` (TTL = longest refresh TTL) let us revoke all tokens of a tenant or of one credential.

**Revocation (instant, cheap)**
- Denylist keys with TTL equal to the max access TTL, so they clean themselves: `revoked-jti:<jti>` (logout), `credential-revoked:<cid>` (credential suspended/deleted, person deleted), `tenant-suspended:<tid>` (tenant suspended).
- `authenticate` runs one command per request: `EXISTS revoked-jti:<jti> credential-revoked:<cid> tenant-suspended:<tid>` (tenant key omitted for manager); count > 0 -> 401. JWT stays stateless except for this single lookup.
- `// ponytail:` refresh reuse detection (revoke the whole token family when an old token is replayed) is not implemented; add when needed.

`req.auth = { sub, aud, tenantId?, credentialId, jti }`.

## Config
```toml
[http]
  trustProxy = false
  [http.cors]
    origins = []               # empty = deny cross-origin
  [http.rateLimit]
    windowMs = 60000
    limit = 100
  [http.manager]
    allowedCidrs = []          # empty = allow all (dev); set in production

[auth]
  issuer = "fund-project"
  [auth.accessTtlSeconds]
    api = 900
    ops = 900
    manager = 900
  [auth.refreshTtlSeconds]
    api = 2592000
    ops = 604800
    manager = 86400
```
`.env`/`.env.example`: `JWT_SECRET` (name only in the example, no value). `HTTP_SCHEMA`, `AUTH_SCHEMA` -> `CONFIG_SCHEMA`; getters `http`, `auth` on `AppConfig`; loader merges `process.env.JWT_SECRET` into `auth.jwtSecret`; defaults in `config/base.toml`; document in `docs/setup/configuration.md` and `docs/setup/environment-configuration.md`.

## Steps
1. `yarn add jose`
2. `get-error-message.ts`; replace 5 `catch (error: any)` (`server.ts`, `database.ts`, `redis.ts`) with `unknown`
3. `http.schema.ts`, `auth.schema.ts`, `JWT_SECRET` injection, `base.toml`, `.env.example`
4. `HttpError`, error and not-found middlewares
5. `access-token-service.ts`, `refresh-token-store.ts`, `revocation-store.ts`, `authenticate.ts`, Request typing
6. `create-http-app.ts`, order: helmet, cors, rate limit, `express.json({limit:'100kb'})`, request logger, health, surfaces, not-found, error handler. Apply `trust proxy` from config
7. Mount `/manager/v1` (ip-allow-list + `authenticate('manager')`), `/ops/v1` (`authenticate('ops')`), `/api/v1` (`authenticate('api')`). Login and refresh routes (phase 2) mount before the guard. Until phase 2 the routers expose no other route, so they answer 401/404 (real behavior, no placeholder endpoints)
8. Health routes; readiness uses injected checks: `appDb.getDb().authenticate()`, `appRedis.getClient('master').ping()`, same for `'queue'`
9. `validate-request.ts`
10. `server.ts`: use factory; shutdown also calls `httpServer.closeIdleConnections()`
11. Docs: `project-structure.md` (tree + diagram with three surfaces), `agent-context.md`, `configuration.md`, `environment-configuration.md`

## Todo
- [ ] jose + JWT_SECRET config
- [ ] error helper + any removal
- [ ] http + auth config
- [ ] errors and middlewares
- [ ] access token, refresh store, revocation store, authenticate
- [ ] app factory + three routers
- [ ] health/ready
- [ ] validate helper + IP allow-list
- [ ] server.ts wiring
- [ ] docs

## Validation
`yarn build`; `yarn dev`; sign test tokens in the REPL (`yarn console`) with the access token service, never paste tokens or the secret into chat or commits:
- `/health` 200; stop Redis: `/ready` 503 without host text
- No token on `/ops/v1/x`, `/api/v1/x`, `/manager/v1/x` -> 401
- `api` token on `/ops/v1` -> 403; `api` token on `/api/v1` passes the guard
- Expired token, tampered signature, `alg: none` token, wrong `iss` -> 401
- Add `revoked-jti:<jti>` or `credential-revoked:<cid>` in Redis: same token -> 401; after TTL the key disappears
- Stop Redis mid-request: guarded route -> 503, not a pass-through
- `allowedCidrs=["10.0.0.0/8"]` and request from 127.0.0.1 to `/manager/v1` -> 403
- Invalid JSON body -> 400 JSON; over limit -> 429; unknown path -> 404 JSON
- Missing or short `JWT_SECRET` -> startup fails with a clear message (no value printed)
- Ctrl+C exits cleanly

## Risks
- Weak or leaked `JWT_SECRET` lets anyone mint tokens for any tenant: >= 32 random bytes, `.env` only, rotate by redeploy (invalidates all access tokens, refresh tokens keep working)
- Access token stays valid until `exp` unless the denylist has an entry; keep the TTL short (15 min)
- Every guarded request costs one Redis `EXISTS`; acceptable, revisit only if it shows up in latency
- Empty CORS list blocks browsers; document how to add origins
- Rate limit is per process (memory store); `// ponytail:` move to `rate-limit-redis` when running several instances
- `trustProxy` wrong makes rate limit and CIDR check see the proxy IP; default false, set behind nginx
- `/manager` shares the public port: production must set `allowedCidrs` and/or block the path at the proxy
