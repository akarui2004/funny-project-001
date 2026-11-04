import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import type { Request, Response } from 'express';
import { ipBlacklist } from 'src/http/middlewares/ip-black-list';
import { logger } from 'src/utils/logger';

/** Run the middleware and return what it passed to `next`. */
const run = (ip: string | undefined, rules: string[]): unknown => {
  let result: unknown = 'next not called';
  ipBlacklist(rules)({ ip } as Request, {} as Response, (arg?: unknown) => { result = arg; });
  return result;
};

describe('ipBlacklist', () => {
  // blocked requests are logged; keep test output clean
  before(() => { logger.silent = true; });

  it('given an empty list, blocks nobody', () => {
    assert.equal(run('8.8.8.8', []), undefined);
  });

  it('given an IP inside a blocked CIDR, responds 403', () => {
    const result = run('10.1.2.3', ['10.0.0.0/8']);
    assert.ok(result instanceof Error);
    assert.equal((result as { status?: number }).status, 403);
  });

  it('for an IP outside every rule, lets it through', () => {
    assert.equal(run('8.8.8.8', ['10.0.0.0/8']), undefined);
  });

  it('why an IPv4-mapped IPv6 client is blocked by an IPv4 rule: dual-stack sockets must not bypass it', () => {
    assert.ok(run('::ffff:10.1.2.3', ['10.0.0.0/8']) instanceof Error);
  });

  it('when the request IP is unknown, lets it through', () => {
    assert.equal(run(undefined, ['10.0.0.0/8']), undefined);
  });
});
