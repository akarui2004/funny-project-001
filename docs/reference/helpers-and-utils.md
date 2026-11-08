# Helpers, Utils And Shared Building Blocks

**Check here before writing a new function.** Everything below already exists,
is tested, and is the project's one way of doing that job. If you need
something that is not listed, add it next to its siblings, export it from the
folder's barrel (`index.ts`), add a test, and list it here.

All imports use the `src/...` alias, never relative paths across folders.

## Quick Lookup

| I need to... | Use | Import from |
|--------------|-----|-------------|
| Log something | `createModuleLogger('<module>')` | `src/utils` |
| Turn an unknown `catch` value into a string | `getErrorMessage(error)` | `src/utils` |
| Get the caller's IP in a request | `getClientIp(req)` | `src/utils/get-client-ip` |
| Check an IP against an IP/CIDR list | `matchIPRules(ip, rules)` | `src/helpers` |
| Detect IPv4 / IPv6 / invalid | `getIPVersion(input)` | `src/helpers/ip-helper` |
| Parse an IP or CIDR (range, mask, count) | `parseIPv4` / `parseIPv6` | `src/helpers/ip-helper` |
| Throw an HTTP error | `HttpError.notFound(...)` etc. | `src/http/errors/http-error` |
| Validate params / body / query with Zod | `validateRequest({...})` | `src/http/middlewares` |
| Restrict / block routes by IP | `ipAllowlist(rules)` / `ipBlacklist(rules)` | `src/http/middlewares` |
| Brand a number as non-negative | `toUInt` / `toUBigInt` | `src/utils` |
| Read config | `appConfig` | `src/app` |
| Query PostgreSQL / Redis | `appDb.getDb<DB>()` / `appRedis.getClient(...)` | `src/app` |
| Get project / config / logs paths | `DEFAULTS.ROOT_DIR`, `.CONFIG_DIR`, `.LOGS_DIR` | `src/constants` |
| Define migration columns | `primaryKey`, `timestamps`, `softDelete`, `oneOf`, `nonNegative` | `src/db/migration-blueprint` |

---

## `src/utils`

Barrel `src/utils/index.ts` exports `getErrorMessage`, `logger`,
`createModuleLogger`, `toUInt`, `toUBigInt`.

> Do **not** import `resolve-project-root` through the barrel (circular with the
> logger) and import `get-client-ip` by its file path. Both are intentionally
> not in the barrel.

### Logger — `logger.ts`

```ts
import { createModuleLogger } from 'src/utils';

const logger = createModuleLogger('wallet');   // line tagged: ... INFO [wallet]: ...
logger.info('created', { walletId });
logger.warn('...');  logger.error('...', { err });
```

- Never use `console.log` in `src/`.
- Output goes to the console (colored) and `logs/<prefix>-<date>.log` (daily rotation).
- Configured only by `LOG_*` env vars (`src/constants/logging.ts`), **not** TOML,
  because the logger exists before the config loads.
- The bare `logger` export is for startup code (`server.ts`); modules use `createModuleLogger`.

### `getErrorMessage(error: unknown): string`

Safe message from anything thrown: `Error` → `.message`, string → itself,
object with string `message` → that, other object → `JSON.stringify`, else `String()`.

```ts
try { await doWork(); } catch (error) { logger.error(`failed: ${getErrorMessage(error)}`); }
```

### `getClientIp(req): { ip, socketIp, forwardedChain }`

`src/utils/get-client-ip.ts`. The **only** correct way to read a client IP.

- `ip`: resolved client IP (IPv4-mapped IPv6 normalized to plain IPv4), `null` if unknown/invalid. Use this for allow/deny, rate-limit keys, logs.
- `socketIp`: TCP peer (client or nearest proxy). Not spoofable.
- `forwardedChain`: hops resolved by Express; empty unless `trust proxy` is set.
- Never read `X-Forwarded-For`, `X-Real-IP`, `CF-Connecting-IP` yourself: clients can fake them. Trust is controlled by `[http] trustProxy` (see [configuration.md](../setup/configuration.md)).

### `toUInt(n)` / `toUBigInt(n)` — `numbers.ts`

Validate and brand a value as `UnsignedInteger` / `UnsignedBigInteger`
(types in `src/types/common-types.ts`). Throw if negative (`toUInt` also if not an integer).

### `resolveRootDir(startDir, marker)` — `resolve-project-root.ts`

Walks up from `startDir` to the folder containing the `.app_root` marker.
Already used by `DEFAULTS`; use `DEFAULTS.ROOT_DIR` instead of calling it.

---

## `src/helpers` (IP toolkit)

Barrel exports `ip-helper/*` and `matchIPRules`. All functions are pure and
synchronous. IPv6 zone ids (`fe80::1%eth0`) are rejected everywhere.

### `matchIPRules(input, rules = []): boolean`

True when the single IP `input` is inside any IP or CIDR in `rules`.

```ts
matchIPRules('10.0.0.5', ['10.0.0.0/24']);          // true
matchIPRules('::ffff:10.0.0.5', ['10.0.0.0/24']);   // true  (mapped IPv4 checked vs IPv4 rules)
matchIPRules('10.0.0.5', []);                       // false (empty rules never match)
matchIPRules('10.0.0.0/24', ['10.0.0.0/24']);       // false (input must be a single IP)
```

Invalid rules are skipped with a logged warning. "Empty list = allow everyone"
is policy of `ipAllowlist`, not of this function, so a blacklist can reuse it.

### `ip-helper/`

| Function | Purpose |
|----------|---------|
| `getIPVersion(input)` | `IP_VERSION.V4` (4), `V6` (6) or `INVALID` (0). Accepts `ip` or `ip/prefix`; validates prefix range (0-32 / 0-128). Use it as the validity check before any other helper. |
| `parseIPv4(input)` / `parseIPv6(input)` | Return `IPv4AddressInfo` / `IPv6AddressInfo`: `ip`, `cidr`, `maskBits`, `isCidr`, `minNum`/`maxNum`, `minIP`/`maxIP`, `totalIPs`. Throw on wrong version. IPv4 numbers are `number`, IPv6 are `bigint`. |
| `ipv4ToNumber(ip)` / `numberToIPv4(n)` | Dotted-quad ↔ unsigned 32-bit. `ipv4ToNumber` assumes a valid IP (validate first). |
| `ipv6ToBigInt(ip)` / `bigIntToIPv6(n)` | IPv6 ↔ 128-bit `bigint`. Output is RFC 5952 compressed. `ipv6ToBigInt` assumes a valid IP; `bigIntToIPv6` throws `RangeError` out of range. |
| `getMappedIPv4(bigint)` | Embedded IPv4 number if the value is `::ffff:a.b.c.d`, else `null`. |
| `splitCidr(input, fullMaskBits)` | Internal-style splitter for `ip/prefix`; prefer `parseIPv4/6`. |

Types: `IPAddressInfo`, `BaseIPAddressInfo` in `src/types/ip-types.ts`.

---

## HTTP layer — `src/http`

`createHttpApp(appConfig.http)` builds the Express app (not listening).
Middleware order is fixed: helmet → cors → rate limit → JSON parser → request
logger → routes → 404 → error handler. Mount new routers **between the request
logger and `notFoundHandler`** in `create-http-app.ts`.

### Errors — `errors/http-error.ts`

Never hand-build `res.status(...).json(...)` for errors. Throw (or `next()`) an `HttpError`;
`errorHandler` turns it into `{ error: { code, message, details? } }`.

```ts
import { HttpError } from 'src/http/errors/http-error';

throw HttpError.notFound('Wallet not found');
throw HttpError.conflict('Email taken', { details: { field: 'email' } });
throw HttpError.badRequest(undefined, { cause: err });   // message defaults to the standard text
```

Available: `badRequest` 400, `unauthorized` 401, `forbidden` 403, `notFound` 404,
`conflict` 409, `unprocessableEntity` 422, `tooManyRequest` 429, `internal` 500,
`serviceUnavailable` 503. Signature: `(message?, { code?, details?, cause? })`.
Need a new status? Add a row to `HTTP_ERRORS`, the static method appears automatically.
5xx messages are hidden from clients and logged server-side.

### `validateRequest({ params?, body?, query? })`

Zod validation middleware. On success the parsed (coerced/stripped) data
**replaces** `req.params/body/query`; on failure all sources are reported together as a 400 with
`details: { body: { field: [msgs] } }`. An invalid UUID gets a dedicated message.

```ts
router.post('/wallets/:id',
  validateRequest({ params: z.object({ id: z.uuid() }), body: z.object({ name: z.string().min(1) }) }),
  handler);
```

### `ipAllowlist(rules)` / `ipBlacklist(rules)`

```ts
router.use('/manager', ipAllowlist(appConfig.http.manager.allowCidrs)); // [] = open
app.use(ipBlacklist(['203.0.113.0/24']));                               // [] = blocks nobody
```

Both use `getClientIp` + `matchIPRules` and fail with 403. Allowlist also denies when the IP is unknown.
Behind a proxy, `[http] trustProxy` must be set or every request looks like the proxy.

### Other middlewares

`errorHandler` (HttpError, ZodError → 400, malformed JSON → 400, rest → 500),
`notFoundHandler`, `requestLogger` (one `METHOD url status - ms` line with IPs).
They are already mounted; do not mount twice.

---

## Config, DB, Redis — `src/app`

```ts
import { appConfig, appDb, appRedis } from 'src/app';

appConfig.http.jsonLimit;            // validated, typed config (TConfigSchema)
const db = appDb.getDb<DB>();        // Kysely instance; throws if not initialized
const redis = appRedis.getClient('queue');
```

- Config layers: `base.toml` → `<NODE_ENV>.toml` → `<NODE_ENV>.local.toml`, Zod-validated at load. Add new keys to the schema in `config-loader/schema/` and `config/base.toml`. Details: [configuration.md](../setup/configuration.md).
- `yarn config:validate` checks the config without starting the server.
- DB access and migrations: [kysely-and-migrations.md](../database/kysely-and-migrations.md).
- Do not create your own `pg` pool, `Kysely` or `Redis` instance.

## Constants — `src/constants`

- `DEFAULTS`: absolute `ROOT_DIR`, `CONFIG_DIR`, `SRC_DIR`, `APP_DIR`, `LOGS_DIR`. Never build paths from `__dirname` + `..`.
- `NODE_ENV`: resolved environment (default `development`).
- `LOGGING`: logger settings from `LOG_*` env vars.

## Migration blueprint — `src/db/migration-blueprint.ts`

Column conventions for migrations. **Never change what an existing helper emits**; add a new one.

```ts
db.schema.createTable('wallets')
  .$call(primaryKey)                                   // uuid id, gen_random_uuid()
  .addColumn('status', 'varchar(20)', (c) => c.notNull().check(oneOf('status', ['open', 'closed'])))
  .addColumn('balance', 'numeric', (c) => c.notNull().check(nonNegative('balance')))
  .$call(softDelete)                                   // deletedAt
  .$call(timestamps)                                   // createdAt, updatedAt
```

Ids are UUID only. `timestamps` defaults cover inserts only; set `updatedAt` on every update.

## Dependencies Already Installed

Use these instead of adding or hand-rolling: `zod` (validation), `date-fns`
(dates), `bignumber.js` (money, never JS floats), `uuid` (ids), `jose` (JWT),
`defu` (deep merge), `commander` (CLI), `ansis` (terminal colors), `express-rate-limit`, `helmet`, `cors`.

## Adding A New Helper

1. Search this page and `src/helpers`, `src/utils` first.
2. Pure, reusable logic → `src/helpers/` (domain) or `src/utils/` (generic); kebab-case file name; export from the folder `index.ts`.
3. Add `tests/<mirrored path>.test.ts` (see [unit-testing-guide.md](../testing/unit-testing-guide.md)).
4. Add a row to the lookup table above.
