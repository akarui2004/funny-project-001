import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Request, Response } from 'express';
import { ipAllowlist } from 'src/http/middlewares/ip-allow-list';

/** Run the middleware and return what it passed to `next`. */
const run = (ip: string | undefined, rules: string[]): unknown => {
  let result: unknown = 'next not called';
  ipAllowlist(rules)({ ip } as Request, {} as Response, (arg?: unknown) => { result = arg; });
  return result;
};

const expectForbidden = (result: unknown): void => {
  assert.ok(result instanceof Error);
  assert.equal((result as { status?: number }).status, 403);
};

describe('ipAllowlist', () => {
  it('given an empty list, lets every IP through', () => {
    assert.equal(run('8.8.8.8', []), undefined);
  });

  it('given an IP inside an allowed CIDR, lets it through', () => {
    assert.equal(run('10.1.2.3', ['10.0.0.0/8']), undefined);
  });

  it('for an IP outside every rule, responds 403', () => {
    expectForbidden(run('8.8.8.8', ['10.0.0.0/8']));
  });

  it('given an IPv4-mapped IPv6 client, matches the IPv4 rule', () => {
    assert.equal(run('::ffff:10.1.2.3', ['10.0.0.0/8']), undefined);
  });

  it('when the request IP is unknown, responds 403 unless the list is empty', () => {
    expectForbidden(run(undefined, ['10.0.0.0/8']));
    assert.equal(run(undefined, []), undefined);
  });

  it('why the 403 hides the IP and rules: avoids leaking the policy', () => {
    const result = run('8.8.8.8', ['10.0.0.0/8']) as Error;
    assert.doesNotMatch(result.message, /8\.8\.8\.8|10\.0\.0\.0/);
  });
});
