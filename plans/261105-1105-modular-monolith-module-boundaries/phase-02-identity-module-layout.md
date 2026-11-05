# Phase 2: Apply Conventions to Roadmap Phase 2 (Identity Module)

## Context
Roadmap phase 2 (`plans/260930-2128-project-hardening-roadmap/phase-02-db-layer-uuid.md`) plans table types and repositories, five modules (`auth`, `tenant`, `user`, `operator`, `credential`) and routes in `src/http/surfaces/*/`. Those five share tables and transactions, so under this plan they form one module. This phase only **changes where the roadmap phase 2 code goes**; data model, endpoints, security rules and validation of the roadmap stay unchanged.

Do not edit the roadmap file until anh accepts this plan; then update its `Files` section to the layout below.

## Layout change
| Roadmap phase 2 path | New path |
|---|---|
| `src/db/repository-helpers.ts` (`whereTenant`, `whereNotDeleted`) | stays in platform `src/db/` (generic query helpers) |
| table interfaces for `tenants, managers, operators, users, credentials` | `src/modules/identity/identity.tables.ts` |
| repositories | `src/modules/identity/repositories/<name>.repository.ts` (private) |
| `src/modules/{auth,tenant,user,operator,credential}/*.service.ts` | `src/modules/identity/services/<name>.service.ts` (private) |
| `src/modules/*/*.schema.ts` | `src/modules/identity/schemas/` |
| `src/http/surfaces/<surface>/<name>.route.ts` | `src/modules/identity/routes/<surface>/<name>.route.ts`, exported as `identityRouters` |
| migrations `<ts>-create-tenants.ts` etc. | `src/modules/identity/migrations/<ts>-create-tenants.ts` etc. (`identity_migration` table) |
| `password-hasher.ts`, `api-key-generator.ts` in `src/utils/` | `src/modules/identity/crypto/` (only identity uses them) |

Phase-1 auth infra (`src/http/auth/*`: token service, refresh store, revocation store, `authenticate`) stays in `src/http/auth` as platform: every module's routes need `req.auth`. Identity calls it to issue tokens.

## Identity contract (bridge for other modules)
```ts
// src/modules/identity/identity.contract.ts
export type PersonType = 'User' | 'Operator' | 'Manager';
export type PersonDto = { id: string; type: PersonType; tenantId: string | null; name: string };
export type TenantDto = { id: string; slug: string; status: 'active' | 'suspended' };

export type IdentityApi = {
  getPerson(type: PersonType, id: string, tenantId: string | null): Promise<PersonDto | null>;
  getPeople(type: PersonType, ids: string[], tenantId: string | null): Promise<PersonDto[]>; // batch, avoids N+1 over network later
  getTenant(tenantId: string): Promise<TenantDto | null>;
};
```
Only what other modules need today; grows on demand. Login, credentials, tenant admin stay internal (HTTP routes, not contract).

## Steps
1. Anh accepts plan; update roadmap phase 2 `Files` section to the new layout
2. Implement roadmap phase 2 with new paths
3. `identity.contract.ts`, `identity.api.ts` mapping rows -> DTOs
4. Register identity in `src/modules/index.ts` (`identityMigrationSource` + routers); surface routers mount `identityRouters`
5. Boundary test green

## Validation
- All roadmap phase 2 validation items unchanged and passing
- `yarn test` boundary test green; `grep -r "modules/identity/" src --include=*.ts` outside `src/modules/identity/` returns nothing
- `identityApi.getPerson` returns a plain object (`JSON.parse(JSON.stringify(x))` deep-equals `x`)

## Risks
- Identity becomes large; fine as long as it is one bounded context. Split internal folders, not modules
- `repository-helpers` shared from platform: every future service needs a copy or shared package at split time (phase 3)
