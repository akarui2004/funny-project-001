# Unit Testing Guide

Hướng dẫn thêm unit test cho project này. Mục tiêu: **không thêm dependency
mới**, dùng những gì đã có sẵn.

## 1. Hiện trạng

- Chưa có test runner, chưa có script `test` trong `package.json`.
- `tests/` chỉ có `.gitkeep`.
- `tsconfig.json` đã `exclude` `**/*.test.ts` và chỉ `include` `src/**` →
  file test **không bị build vào `dist/`**. Không cần sửa gì.
- Node `22.23.4` có sẵn test runner (`node:test`) + assert (`node:assert/strict`).
- `tsx` đã có trong `dependencies` → chạy được TypeScript và hiểu alias
  `src/*` từ `tsconfig.json`.

## 2. Lựa chọn công cụ

| Option | Thêm dep? | Khi nào dùng |
|--------|-----------|--------------|
| **`node:test` + `tsx`** (đã chốt) | Không | Đủ cho unit test: `describe/it`, `mock`, coverage, watch |
| Vitest | Có (`vitest`) | Khi cần UI đẹp, snapshot, mock module mạnh hơn |
| Jest | Có (`jest`, `ts-jest`, `@types/jest`) | Không khuyên — config TS + alias rườm rà |

Đã kiểm tra: `npx tsx --test <file>` chạy OK với import `src/helpers/ip-resolver`.

## 3. Setup (1 bước)

Thêm vào `scripts` trong `package.json`:

```json
"test": "tsx --test \"tests/**/*.test.ts\"",
"test:watch": "tsx --test --watch \"tests/**/*.test.ts\"",
"test:coverage": "tsx --test --experimental-test-coverage \"tests/**/*.test.ts\""
```

Lưu ý: phải để glob trong dấu `"..."` để Node tự expand (zsh/sh expand khác nhau).

Chạy:

```bash
yarn test
yarn test:watch
yarn test:coverage
```

## 4. Cấu trúc thư mục

Đặt test trong `tests/`, **mirror** cấu trúc `src/`:

```text
src/helpers/ip-resolver.ts                 → tests/helpers/ip-resolver.test.ts
src/utils/get-error-message.ts             → tests/utils/get-error-message.test.ts
src/http/errors/http-error.ts              → tests/http/errors/http-error.test.ts
src/http/middlewares/not-found-handler.ts  → tests/http/middlewares/not-found-handler.test.ts
```

Quy ước:

- Tên file: `<tên-file-gốc>.test.ts` (kebab-case, giống `docs/code-standards.md`).
- Import code bằng alias `src/...`, không dùng `../../src/...`.
- Mỗi `describe` = 1 function/class, mỗi `it` = 1 hành vi.

## 5. Mẫu test

### 5.1 Pure function — `IPResolver.identifyVersion`

Đây là chỗ nên bắt đầu: logic thuần, nhiều nhánh, không phụ thuộc DB/Redis.

```ts
// tests/helpers/ip-resolver.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import IPResolver from 'src/helpers/ip-resolver';

describe('IPResolver.identifyVersion', () => {
  const cases: Array<[string, number]> = [
    ['192.168.1.1', 4],
    ['192.168.1.0/24', 4],
    ['10.0.0.0/0', 4],
    ['10.0.0.0/32', 4],
    ['10.0.0.0/33', 0],     // vượt max CIDR v4
    ['10.0.0.0/024', 0],    // leading zero bị từ chối
    ['::1', 6],
    ['2001:db8::/32', 6],
    ['2001:db8::/128', 6],
    ['2001:db8::/129', 0],  // vượt max CIDR v6
    ['1.2.3.4/24/8', 0],    // nhiều hơn 1 dấu '/'
    ['not-an-ip', 0],
    ['', 0],
  ];

  for (const [input, expected] of cases) {
    it(`"${input}" → ${expected}`, () => {
      assert.equal(IPResolver.identifyVersion(input), expected);
    });
  }
});
```

Table-driven như trên giúp thêm case mới chỉ bằng 1 dòng.

### 5.2 Error helper — `getErrorMessage`

```ts
// tests/utils/get-error-message.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getErrorMessage } from 'src/utils/get-error-message';

describe('getErrorMessage', () => {
  it('lấy message từ Error', () => {
    assert.equal(getErrorMessage(new Error('boom')), 'boom');
  });

  it('trả nguyên string', () => {
    assert.equal(getErrorMessage('oops'), 'oops');
  });

  it('JSON hoá object không có message', () => {
    assert.equal(getErrorMessage({ a: 1 }), '{"a":1}');
  });

  it('không crash với object vòng lặp', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    assert.equal(typeof getErrorMessage(circular), 'string');
  });
});
```

### 5.3 Express middleware — fake `req` / `res` / `next`

Middleware chỉ là function `(req, res, next)`, không cần chạy server:

```ts
// tests/http/middlewares/not-found-handler.test.ts
import { it, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import { notFoundHandler } from 'src/http/middlewares/not-found-handler';
import { BaseHttpError } from 'src/http/errors/http-error';

it('gọi next() với lỗi 404', () => {
  const req = { method: 'GET', originalUrl: '/missing' } as Request;
  const next = mock.fn();

  notFoundHandler(req, {} as Response, next);

  assert.equal(next.mock.callCount(), 1);
  const err = next.mock.calls[0]?.arguments[0];
  assert.ok(err instanceof BaseHttpError);
  assert.equal(err.status, 404);
  assert.equal(err.message, 'Cannot GET /missing');
});
```

Khi test middleware cần `res.status().json()`, tạo fake chainable:

```ts
const res = {
  status: mock.fn(function (this: unknown) { return this; }),
  json: mock.fn(),
} as unknown as Response;
```

## 6. Nên test cái gì trước

Theo thứ tự ưu tiên (logic thuần → dễ test → đáng tiền nhất):

1. `src/helpers/ip-resolver.ts` — `identifyVersion`, và `matchIPRules` khi
   anh implement (viết test trước rồi implement = TDD, rất hợp cho CIDR/bitmask).
2. `src/http/errors/http-error.ts` — các static method (`HttpError.notFound()`…),
   `toJSON()` có/không có `details`.
3. `src/utils/get-error-message.ts`.
4. `src/http/middlewares/*` — `not-found-handler`, `error-handler`,
   `ip-black-list`/`ip-allow-list` (sau khi implement).
5. `src/app/config-loader/schema/*` — `SCHEMA.safeParse(...)` với input hợp lệ
   và không hợp lệ.

**Không unit test** `src/app/connections/*` (DB/Redis) và migration — đó là
việc của integration test, cần Postgres/Redis thật. Để sau.

## 7. Mock khi cần

`node:test` có sẵn `mock`:

```ts
import { mock } from 'node:test';

const fn = mock.fn();                       // spy function
mock.method(someObject, 'methodName', () => 'fake');  // thay method
mock.timers.enable({ apis: ['Date'] });     // giả thời gian
// mock.restoreAll() trong afterEach nếu dùng mock.method
```

Nếu thấy cần mock cả module (ví dụ chặn import `logger`), đó là dấu hiệu nên
tách logic thuần ra function riêng để test, thay vì mock.

## 8. Type check cho test (tuỳ chọn)

`tsx` **không** type-check, chỉ strip type. `yarn build` cũng không check test
vì `tsconfig.json` exclude chúng. Nếu muốn bắt lỗi type trong test, tạo
`tsconfig.test.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": { "noEmit": true, "rootDir": "./" },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

và script: `"test:types": "tsc -p tsconfig.test.json"`.

## 9. Sau khi xong

- Cập nhật mục **Verification** trong `docs/agent-context.md`: thêm `yarn test`,
  bỏ dòng "There is no configured automated test suite currently".
- Xoá `tests/.gitkeep` khi đã có file test.
- (Sau này) thêm `yarn test` vào CI nếu có pipeline.

## Checklist

- [ ] Thêm script `test`, `test:watch`, `test:coverage` vào `package.json`
- [ ] `tests/helpers/ip-resolver.test.ts` cho `identifyVersion`
- [ ] Viết test cho `matchIPRules` trước khi implement
- [ ] `tests/http/errors/http-error.test.ts`
- [ ] `tests/utils/get-error-message.test.ts`
- [ ] `tests/http/middlewares/not-found-handler.test.ts`
- [ ] (Tuỳ chọn) `tsconfig.test.json` + `test:types`
- [ ] Cập nhật `docs/agent-context.md`
