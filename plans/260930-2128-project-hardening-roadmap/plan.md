---
title: Project hardening roadmap
status: proposed
created: 2026-09-30
updated: 2026-09-30
---

# Project Hardening Roadmap

## Overview
Repo builds and boots but has no routes, models, seeders, tests. Gap list from repo scan 2026-09-30, priorities set by anh. Each phase = one PR off `main` (after PR #12 merges).

## Decisions (fixed by anh)
- **UUID primary and foreign keys everywhere.** No auto-increment / serial / bigint ids (security: unguessable, no enumeration).
- **Multi-tenant, shared schema + `tenant_id` UUID.** Tenant = ops. Three surfaces in one process, one port: `/api/v1` (end users), `/ops/v1` (tenant admins), `/manager/v1` (platform admins over all ops).
- **Auth = JWT access token (~15 min, HS256, `jose`) + opaque refresh token on Redis with rotation.** Instant revoke via a short-TTL Redis denylist (jti, user, tenant). Secret `JWT_SECRET` lives in `.env`.
- **Identity model (anh's schema):** `tenants`, `operators`, `users`, `credentials` (polymorphic `targetId`/`targetType`, types `password`/`key-based`, `totp` deferred), plus a separate `managers` table. `tenantId` NOT NULL on `users`/`operators`; `credentials.tenantId` NULL only for managers. Login = `tenantSlug` + `accessKey` + `secret`. Surfaces: manager -> Manager, ops -> Operator, api -> User. No `role` column/claim: role-based and user-based permissions are a separate future work item, not in this roadmap.
- **Tenant id comes from the signed JWT (`tid`)**, never from client input. Login body carries `tenantSlug` only to pick which tenant to authenticate against.
- PostgreSQL >= 16, UUID v4.
- **No ESLint / Prettier.** Not worth it for this project.
- **No CI for now.** Avoid build/run cost; last priority.
- Test setup (vitest) is done by anh; plan only prepares the steps.

## Phases (in priority order)
| Pri | Phase | Status | Depends on |
|-----|-------|--------|------------|
| 1 | [HTTP foundation, three surfaces, session auth](phase-01-http-routes.md) | pending | PR #12 merged |
| 2 | [Multi-tenant DB layer, login, resources](phase-02-db-layer-uuid.md) | pending | 1 |
| 3 | [Docs and repo hygiene](phase-03-docs-and-repo-hygiene.md) | pending | none |
| 4 | [Test setup (anh does it)](phase-04-test-setup.md) | pending | none; useful before 1 for route tests |
| 5 | [CI pipeline (deferred)](phase-05-ci-pipeline.md) | deferred | 4 |

Priority of phase 4 was not stated; placed after docs. Move it earlier if anh wants route tests while building phase 1.

## Success criteria
- `GET /health` and `/ready` work; errors return JSON, never raw DB/Redis text
- Login works on all three surfaces; a token only works on its own surface; revoke and tenant suspend kill sessions immediately
- A tenant can never read or write another tenant's data (cross-tenant id -> 404); ids are UUID v4; password never returned, stored hashed
- Seeder and model creatable via CLI; migrations and models aligned
- README and docs match reality

## Unresolved questions
- Existing `users` rows are sample data from CLI migration tests; anh deletes them before phase 2. The phase 2 migration still aborts if rows remain
