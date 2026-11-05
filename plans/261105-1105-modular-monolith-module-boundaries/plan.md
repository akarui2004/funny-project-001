---
title: Modular monolith, module boundaries ready for later service split
status: proposed
created: 2026-11-05
updated: 2026-11-05
---

# Modular Monolith: Module Boundaries

## Overview
Goal: one Express process now, each business module built so it can later become its own service without rewriting callers. Modules talk through a typed contract (the "bridge"). Today the bridge is an in-process call; later it can be swapped for an HTTP or RPC client, and callers do not change.

Repo state (2026-11-05): no routes, no repositories (Kysely, no models), one applied migration (`create-user`). `src/http/` has errors and middlewares only (roadmap phase 1 partly done). Roadmap phase 2 (`plans/260930-2128-project-hardening-roadmap/phase-02-db-layer-uuid.md`) is the first work that creates `src/modules/*`. **This plan must land before that phase** and changes its file layout (see phase 2 below).

## Outcome / acceptance criteria
- Every module lives in `src/modules/<module>/` and exposes only `index.ts` (contract, in-process API, routers, model init)
- A test fails when code imports another module's internals or another module's table types
- No DB foreign key, JOIN, or transaction spans two modules
- Data crossing the bridge is plain serializable DTOs; every contract method is async
- A written split playbook says exactly what changes when a module becomes a service

## Non-goals
- No HTTP, gRPC, or message-broker adapter now (written when a module is actually split)
- No event bus now (see unresolved questions)
- No per-module DB, Docker image, or deploy unit
- No change to the auth/token design of roadmap phase 1

## Proposed decisions (anh confirms)
1. **Module = bounded context, not table.** Roadmap phase 2 tables `tenants`, `managers`, `operators`, `users`, `credentials` are tightly coupled (polymorphic `credentials.targetId`, the one-transaction "tenant + first operator + credential" create). Splitting them into 5 modules breaks the rules above. They become **one `identity` module**. Future domains (`product`, `fund`, ...) are separate modules that refer to people by id only.
2. **Shared Postgres schema `public`**, table ownership recorded in each module's `index.ts` header and in docs. Separate schema per module can come later (the `datasource.schema` field exists).
3. **No DB FK across modules** (e.g. `products.ownerId` -> `users.id`): integrity checked in the service through the contract. Trade-off: less DB integrity, free split later. FKs inside one module stay.
4. **Per-module migrations folder + tracking table**: `src/modules/<m>/migrations/`, Kysely `Migrator` with tables `<m>_migration` / `<m>_migration_lock` (see `src/db/migration-runner.ts`, `MigrationSource`). Platform keeps `src/db/migrations/` (`platform_migration`). Order across sources does not matter because cross-module FKs are banned.
5. **Boundary check = `node:test` file**, no ESLint (roadmap decision: no ESLint).

## Phases
| # | Phase | Status | Depends on |
|---|-------|--------|------------|
| 1 | [Module conventions, registry, boundary test](phase-01-module-conventions-and-boundary-test.md) | proposed | none |
| 2 | [Apply to roadmap phase 2 (identity module)](phase-02-identity-module-layout.md) | proposed | 1; roadmap phase 1 |
| 3 | [Split playbook (doc only, executed only when a split is decided)](phase-03-service-split-playbook.md) | proposed | 2 |

## Risks
- Contract discipline is social; the boundary test catches imports, not shared tables queried with raw SQL. Mitigation: raw SQL rule in `code-standards.md`, review
- Over-splitting into too many tiny modules leads to cross-module transactions; keep modules coarse (decision 1)
- Async contract over in-process call adds no real cost. Kysely rows are already plain objects, but DTO mapping stays mandatory (rename columns, hide secrets, ISO dates)

## Unresolved questions
- Confirm decision 1: one `identity` module, or keep `auth` separate from `identity`?
- Shared `public` schema, or Postgres schema per module from day one?
- Cross-module FK ban (decision 3): accept, or keep FKs until a split is real?
- Need async events between modules now (e.g. `user.deleted` -> product cleanup), or only sync contract calls? If events: in-process `EventEmitter` behind a contract now, Redis `queue` later
- Which module is the first real candidate to split? Drives whether phase 3 ever runs
