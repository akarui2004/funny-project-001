# Unit Testing Guide

How unit tests work in this project. Rules on **what** must be tested live in
the Testing section of [`docs/code-standards.md`](../code-standards.md); this
guide covers the **how**.

No test dependencies were added: tests use Node's built-in `node:test` and
`node:assert/strict`, run through `tsx` (already a dependency), which also
resolves the `src/*` alias from `tsconfig.json`.

## 1. Commands

| Command | What it does |
|---------|--------------|
| `yarn test` | Run every `tests/**/*.test.ts` with the compact pretty reporter |
| `yarn test:watch` | Same, re-running on file changes |
| `yarn test:coverage` | Run with the `spec` reporter and `--experimental-test-coverage` |
| `yarn test:types` | Type-check `src/` and `tests/` via `tsconfig.test.json` (no emit) |

`tsx` only strips types, and `yarn build` excludes tests, so run
`yarn test:types` after changing tests to catch type errors.

To run a single file:

```bash
npx tsx --test tests/helpers/ip-resolver.test.ts
```

Keep the glob in `package.json` quoted (`"tests/**/*.test.ts"`) so Node expands
it instead of the shell (zsh and sh expand `**` differently).

## 2. Layout

```text
tests/
├── reporters/pretty-reporter.mts   # custom node:test reporter used by `yarn test`
├── tsconfig.json                   # extends ../tsconfig.test.json for the editor
├── app/config-loader/schema/       # Zod schema rules
├── helpers/                        # ip-resolver
├── http/errors/                    # http-error
├── http/middlewares/               # error-handler, validate-request
├── scripts/db/helpers/             # migration-column-parser / -renderer
└── utils/                          # get-error-message, resolve-project-root
```

Conventions:

- Mirror the source path: `src/a/b.ts` → `tests/a/b.test.ts`,
  `scripts/a/b.ts` → `tests/scripts/a/b.test.ts`.
- File name: `<source-file-name>.test.ts` (kebab-case).
- Import code under `src/` through the `src/...` alias, never `../../src/...`.
  Code under `scripts/` has no alias, so import it with a relative path.
- One `describe` per function or class; one `it` per behavior.
- Bug fix in a covered file → add an `it` that fails without the fix.

## 3. Patterns

### 3.1 Table-driven cases

Best for parsers and validators: adding a case is one line.

```ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import IPResolver from 'src/helpers/ip-resolver';

describe('IPResolver.identifyVersion', () => {
  const cases: Array<[string, number]> = [
    ['192.168.1.0/24', 4],
    ['10.0.0.0/33', 0],     // exceeds max CIDR v4
    ['2001:db8::/32', 6],
  ];

  for (const [input, expected] of cases) {
    it(`"${input}" → ${expected}`, () => {
      assert.equal(IPResolver.identifyVersion(input), expected);
    });
  }
});
```

See also `tests/app/config-loader/schema/redis.schema.test.ts` (accept/reject
table) and `tests/scripts/db/helpers/migration-column-renderer.test.ts`.

### 3.2 Express middleware with a fake `req` / `res` / `next`

A middleware is just a function; no server is needed. Capture what `res`
receives with a small chainable stub:

```ts
function run(err: unknown) {
  const sent: { status?: number; body?: any } = {};
  const res = {
    status(code: number) { sent.status = code; return this; },
    json(body: unknown) { sent.body = body; return this; },
  } as unknown as Response;
  const req = { method: 'GET', originalUrl: '/x' } as Request;
  errorHandler(err, req, res, (() => {}) as NextFunction);
  return sent;
}
```

For async middleware (`validateRequest`), `await` the returned promise and
record the argument passed to `next`. See
`tests/http/middlewares/validate-request.test.ts`.

### 3.3 Zod schemas

Test only the rules beyond plain shape (`min`, `regex`, `refine`, defaults),
via `SCHEMA.safeParse(input).success` or `SCHEMA.parse(input)` for defaults.

### 3.4 Filesystem helpers

Use a throwaway directory from `fs.mkdtempSync(path.join(os.tmpdir(), ...))`
and remove it in `after()`. See `tests/utils/resolve-project-root.test.ts`.

### 3.5 Silencing the logger

Modules that log on error paths (e.g. `error-handler.ts`) write to the
console and `logs/`. Silence them in the test file:

```ts
import { logger } from 'src/utils/logger';

before(() => { logger.silent = true; });
```

## 4. Mocking

`node:test` ships with `mock`:

```ts
import { mock } from 'node:test';

const fn = mock.fn();                                 // spy function
mock.method(someObject, 'methodName', () => 'fake');  // replace a method
mock.timers.enable({ apis: ['Date'] });               // fake time
// call mock.restoreAll() in afterEach when using mock.method
```

If you need to mock a whole module, extract the pure logic into its own
function and test that instead.

## 5. Not Unit-Tested Yet

| Code | Reason | Unblock by |
|------|--------|------------|
| `buildSequelizeOptions` (`src/app/connections/database.ts`) | Importing the module constructs `appDb`, which loads and validates TOML config; it passes only when a local `config/<env>.local.toml` exists | Move the function into its own module |
| `ip-allow-list.ts`, `ip-black-list.ts`, `IPResolver.matchIPRules` | Not implemented yet | Write tests first, then implement (TDD fits CIDR/bitmask logic) |
| `src/app/connections/*`, migrations | Need real PostgreSQL/Redis | Integration tests (none yet) |

## Checklist

- [x] `test`, `test:watch`, `test:coverage`, `test:types` scripts
- [x] `tsconfig.test.json` and `tests/tsconfig.json`
- [x] Pretty reporter (`tests/reporters/pretty-reporter.mts`)
- [x] Tests for the files required by `docs/code-standards.md`
- [x] `docs/agent-context.md` Verification section mentions `yarn test`
- [ ] Testable `buildSequelizeOptions` (see section 5)
- [ ] Tests for `matchIPRules` before implementing it
- [ ] Tests for `ip-allow-list` / `ip-black-list` once implemented
- [ ] Run `yarn test` in CI once a pipeline exists
