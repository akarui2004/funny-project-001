import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DummyDriver, Kysely, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler } from 'kysely';
import * as MigrationUtils from 'src/db/migration-blueprint';
import type { ColumnSpec } from 'src/db/migration-blueprint';

// Compiles DDL without a database
const db = new Kysely<any>({
  dialect: {
    createAdapter: () => new PostgresAdapter(),
    createDriver: () => new DummyDriver(),
    createIntrospector: (kysely) => new PostgresIntrospector(kysely),
    createQueryCompiler: () => new PostgresQueryCompiler(),
  },
});

const ddl = (columns: Record<string, ColumnSpec>) =>
  MigrationUtils.addColumns(db.schema.createTable('t'), columns).compile().sql;

describe('addColumns', () => {
  it('how columns are emitted: in insertion order', () => {
    assert.equal(ddl({ b: MigrationUtils.text(), a: MigrationUtils.text(true) }), 'create table "t" ("b" text, "a" text not null)');
  });
});

describe('primaryKey', () => {
  it('without arguments, creates a uuid key with a random default', () => {
    assert.equal(ddl({ id: MigrationUtils.primaryKey() }), 'create table "t" ("id" uuid default gen_random_uuid() not null primary key)');
  });
});

describe('uuid', () => {
  it('given required and unique, adds both constraints', () => {
    assert.equal(ddl({ ref: MigrationUtils.uuid(true, true) }), 'create table "t" ("ref" uuid not null unique)');
  });
});

describe('unsignedInteger', () => {
  it('why it adds a check: PostgreSQL has no unsigned type', () => {
    assert.match(ddl({ qty: MigrationUtils.unsignedInteger() }), /"qty" integer check \("qty" >= 0\)/);
  });
});

describe('bigInteger', () => {
  it('with a default beyond the safe integer range, keeps it exact', () => {
    assert.match(ddl({ n: MigrationUtils.bigInteger(true, 9007199254740993n) }), /"n" bigint default '9007199254740993' not null/);
  });
});

describe('decimal', () => {
  it('without arguments, uses numeric(36, 18) with a zero default', () => {
    assert.equal(ddl({ amount: MigrationUtils.decimal() }), 'create table "t" ("amount" numeric(36, 18) default \'0\')');
  });
});

describe('enumType', () => {
  it('with values and a default, restricts the column through a check', () => {
    assert.equal(
      ddl({ status: MigrationUtils.enumType(['a', 'b'], true, 'a') }),
      'create table "t" ("status" varchar(64) default \'a\' not null check ("status" in (\'a\', \'b\')))',
    );
  });

  it('without values, throws', () => {
    assert.throws(() => MigrationUtils.enumType([]), /at least one value/);
  });
});

describe('foreignKey', () => {
  it('with referential actions, adds them to the reference', () => {
    assert.match(ddl({ userId: MigrationUtils.foreignKey('users', 'id', true, 'uuid', 'cascade') }),
      /"userId" uuid not null references "users" \("id"\) on delete cascade/);
  });
});

describe('timestampColumns', () => {
  it('how they default: to now() on insert', () => {
    assert.match(ddl({ ...MigrationUtils.timestampColumns }), /"createdAt" timestamptz default now\(\) not null, "updatedAt" timestamptz default now\(\) not null/);
  });
});
