import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DummyDriver, Kysely, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler } from 'kysely';
import { nonNegative, oneOf, primaryKey, softDelete, timestamps } from 'src/db/migration-blueprint';

// Compiles DDL without a database
const db = new Kysely<any>({
  dialect: {
    createAdapter: () => new PostgresAdapter(),
    createDriver: () => new DummyDriver(),
    createIntrospector: (kysely) => new PostgresIntrospector(kysely),
    createQueryCompiler: () => new PostgresQueryCompiler(),
  },
});

// These strings pin the emitted DDL: a failing assertion here means history would change on fresh databases
describe('migration blueprint', () => {
  it('emits the conventional table columns in chain order', () => {
    const ddl = db.schema.createTable('t').$call(primaryKey).addColumn('name', 'text').$call(softDelete).$call(timestamps).compile().sql;
    assert.equal(
      ddl,
      'create table "t" ("id" uuid default gen_random_uuid() not null primary key, "name" text, "deletedAt" timestamptz, ' +
        '"createdAt" timestamptz default now() not null, "updatedAt" timestamptz default now() not null)',
    );
  });

  it('oneOf emits an IN check with quoted literals', () => {
    const ddl = db.schema.createTable('t').addColumn('status', 'varchar(64)', (col) => col.check(oneOf('status', ['a', "b'c"]))).compile().sql;
    assert.equal(ddl, `create table "t" ("status" varchar(64) check ("status" in ('a', 'b''c')))`);
  });

  it('oneOf rejects an empty value list', () => {
    assert.throws(() => oneOf('status', []), /at least one value/);
  });

  it('nonNegative emits a >= 0 check', () => {
    const ddl = db.schema.createTable('t').addColumn('qty', 'integer', (col) => col.check(nonNegative('qty'))).compile().sql;
    assert.equal(ddl, 'create table "t" ("qty" integer check ("qty" >= 0))');
  });
});
