import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Request, Response } from 'express';
import { z } from 'zod';
import { HttpError } from 'src/http/errors/http-error';
import { RequestValidationSchemas, validateRequest } from 'src/http/middlewares/validate-request';

async function run(schemas: RequestValidationSchemas, input: Partial<Record<'params' | 'body' | 'query', unknown>>) {
  const req = { params: {}, body: {}, query: {}, ...input } as unknown as Request;
  let nextArg: unknown = 'not-called';
  await validateRequest(schemas)(req, {} as Response, (arg?: unknown) => { nextArg = arg; });
  return { req, nextArg };
}

describe('validateRequest', () => {
  it('calls next() with no error when every source is valid', async () => {
    const { nextArg } = await run({ body: z.object({ name: z.string() }) }, { body: { name: 'a' } });
    assert.equal(nextArg, undefined);
  });

  it('replaces request data with the parsed output in place', async () => {
    const body = { age: '5', extra: 'drop me' };
    const { req } = await run({ body: z.object({ age: z.coerce.number() }) }, { body });
    assert.deepEqual(req.body, { age: 5 });
    assert.equal(req.body, body); // same object, mutated
  });

  it('skips sources that have no schema', async () => {
    const { req, nextArg } = await run({ body: z.object({}) }, { query: { keep: '1' } });
    assert.equal(nextArg, undefined);
    assert.deepEqual(req.query, { keep: '1' });
  });

  it('collects failures from every source into one 400 HttpError', async () => {
    const { nextArg } = await run(
      { body: z.object({ name: z.string() }), query: z.object({ page: z.coerce.number().int() }) },
      { body: {}, query: { page: 'x' } },
    );
    assert.ok(nextArg instanceof HttpError);
    assert.equal(nextArg.status, 400);
    assert.equal(nextArg.message, 'Validation failed for body, query');
    const details = nextArg.details as Record<string, Record<string, string[]>>;
    assert.deepEqual(Object.keys(details), ['body', 'query']);
    assert.ok(details.body?.name?.length);
    assert.ok(details.query?.page?.length);
  });

  it('groups a root-level issue under "(root)"', async () => {
    const { nextArg } = await run({ body: z.string() }, { body: {} });
    assert.ok(nextArg instanceof HttpError);
    assert.ok((nextArg.details as any).body['(root)'].length);
  });

  it('uses a UUID-specific message when a uuid format fails', async () => {
    const { nextArg } = await run({ params: z.object({ id: z.uuid() }) }, { params: { id: 'nope' } });
    assert.ok(nextArg instanceof HttpError);
    assert.equal(nextArg.message, 'Invalid UUID format in path parameter');
  });
});
