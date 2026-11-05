# Phase 3: Service Split Playbook (executed only when a split is decided)

Do nothing now. This file says what the work is when one module (call it `X`) moves out of the monolith. Trigger: real need, e.g. X must scale or deploy on its own, or another team owns it. Not a goal by itself.

## Steps when splitting module X
1. **Platform**: new repo or workspace package with copies of `src/app` (config, connections), `src/http` (errors, middlewares, auth verify), `src/utils`, `src/db/` migration runner + repository helpers. Shared code becomes an internal package only if two or more services need it.
2. **Service**: X's `routes`, `services`, `repositories`, `*.tables.ts`, `migrations/` (with its `<x>_migration` table), `schemas` move as is. Its `<x>.api.ts` becomes the HTTP handlers of an internal endpoint set (`/internal/v1/x/...`), one per contract method.
3. **Bridge swap** in the monolith: `src/modules/x/index.ts` keeps exporting the contract type; `<x>Api` becomes `createHttpXApi(baseUrl)` (native `fetch`, timeout via `AbortSignal.timeout`, JSON parse, 404 -> `null`, 5xx/timeout -> throw). Callers do not change.
4. **Internal auth**: service-to-service token (separate `aud`, e.g. `internal`, same `jose` HS256 or asymmetric keys); internal endpoints never on the public port.
5. **Data**: move X's tables to X's own DB (`pg_dump -t` per owned table, backup first); monolith drops them after cutover. Possible only because of the no-cross-module FK/JOIN rule.
6. **Consistency**: any flow that called X inside a monolith transaction becomes an outbox + event (Redis `queue` connection already exists) or a compensating step. Boundary rules should have made this list empty.
7. **Public routes**: proxy (nginx) routes X's public paths to the new service, or the monolith forwards; decide per case.
8. **Ops**: health/ready, logging (`createModuleLogger` tags), config TOML per service, deploy.

## Checklist before a split is allowed
- [ ] Boundary test green for X for a meaningful period
- [ ] No cross-module transaction touching X
- [ ] Contract methods batch-friendly (no N+1 loops over the bridge)
- [ ] Callers handle `X` being unavailable (timeout, error mapping to 503)

## Risks
- Network failure modes (timeouts, partial failure) absent in-process; must be handled at callers
- Duplicated platform code drifts between services
- Distributed tracing absent; add correlation id header propagation at split time
