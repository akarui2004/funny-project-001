import { sql } from 'kysely';
import type { CreateTableBuilder, RawBuilder } from 'kysely';

/**
 * Project column conventions for migrations. Everything else is written with the plain Kysely builder.
 *
 * Migrations replay these helpers on every fresh database, so NEVER change what an existing helper emits:
 * add a new helper instead, or databases created before and after the change end up with different schemas.
 *
 * Table-level helpers plug into the builder chain with `$call`:
 *   db.schema.createTable('wallets').$call(primaryKey).addColumn(...).$call(softDelete).$call(timestamps)
 * Check helpers go inside a column callback: `(col) => col.notNull().check(oneOf('status', ['a', 'b']))`.
 */

type TableBuilder<TB extends string> = CreateTableBuilder<TB, any>;

// UUID only: sequential ids are guessable (see docs/code-standards.md)
export const primaryKey = <TB extends string>(table: TableBuilder<TB>): TableBuilder<TB> =>
  table.addColumn('id', 'uuid', (col) => col.defaultTo(sql`gen_random_uuid()`).notNull().primaryKey());

export const softDelete = <TB extends string>(table: TableBuilder<TB>): TableBuilder<TB> =>
  table.addColumn('deletedAt', 'timestamptz');

// DB defaults cover inserts only; repositories must set updatedAt on every update
export const timestamps = <TB extends string>(table: TableBuilder<TB>): TableBuilder<TB> =>
  table
    .addColumn('createdAt', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updatedAt', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull());

// varchar + CHECK instead of a PostgreSQL enum type: self-contained and easy to alter in a later migration
export const oneOf = (column: string, values: string[]): RawBuilder<unknown> => {
  if (!values.length) throw new Error('oneOf needs at least one value');
  return sql`${sql.ref(column)} in (${sql.join(values.map((value) => sql.lit(value)))})`;
};

// PostgreSQL has no unsigned types; a CHECK keeps the same guarantee
export const nonNegative = (column: string): RawBuilder<unknown> => sql`${sql.ref(column)} >= 0`;
