import { sql } from 'kysely';
import type { ColumnDefinitionBuilder, CreateTableBuilder, OnModifyForeignAction, RawBuilder } from 'kysely';

// Kysely does not export its data type parameter type; derive it so it follows upgrades
type DataTypeExpression = Parameters<CreateTableBuilder<string>['addColumn']>[1];

/**
 * Column helpers for migrations. Each helper returns a spec; `addColumns` applies a `{ name: spec }` map
 * to a create-table builder in insertion order, so generated migrations keep the object-literal style
 * emitted by scripts/db/helpers/migration-column-renderer.ts.
 */
export type ColumnSpec = {
  type: DataTypeExpression;
  build: (col: ColumnDefinitionBuilder, name: string) => ColumnDefinitionBuilder;
};

// SQL functions (e.g. now()) are passed as sql`...`; plain values become literals in the DDL
type DefaultValue = string | number | RawBuilder<unknown>;

const column = (
  type: DataTypeExpression,
  required: boolean,
  defaultValue?: DefaultValue,
  extra?: ColumnSpec['build'],
): ColumnSpec => ({
  type,
  build: (col, name) => {
    let built = required ? col.notNull() : col;
    if (defaultValue !== undefined) built = built.defaultTo(defaultValue);
    return extra ? extra(built, name) : built;
  },
});

export const addColumns = <TB extends string>(
  table: CreateTableBuilder<TB, any>,
  columns: Record<string, ColumnSpec>,
): CreateTableBuilder<TB, any> =>
  Object.entries(columns).reduce((builder, [name, spec]) => builder.addColumn(name, spec.type, (col) => spec.build(col, name)), table);

// UUID only: sequential ids are guessable (see docs/code-standards.md)
export const primaryKey = (): ColumnSpec => column('uuid', true, sql`gen_random_uuid()`, (col) => col.primaryKey());

export const uuid = (required: boolean = false, unique: boolean = false): ColumnSpec =>
  column('uuid', required, undefined, (col) => (unique ? col.unique() : col));

export const genericString = (required: boolean = false, length: number = 255, defaultValue?: DefaultValue): ColumnSpec =>
  column(`varchar(${length})`, required, defaultValue);

export const text = (required: boolean = false): ColumnSpec => column('text', required);

export const integer = (required: boolean = false, defaultValue?: number): ColumnSpec => column('integer', required, defaultValue);

// PostgreSQL has no unsigned types; a CHECK keeps the same guarantee
export const unsignedInteger = (required: boolean = false, defaultValue?: number): ColumnSpec =>
  column('integer', required, defaultValue, (col, name) => col.check(sql`${sql.ref(name)} >= 0`));

// String literal keeps values beyond Number.MAX_SAFE_INTEGER exact; PostgreSQL casts it to bigint
export const bigInteger = (required: boolean = false, defaultValue?: bigint): ColumnSpec =>
  column('bigint', required, defaultValue === undefined ? undefined : String(defaultValue));

/**
 * p mean precision
 * s mean scale
 */
export const decimal = (required: boolean = false, p = 36, s = 18, defaultValue = 0): ColumnSpec =>
  column(`numeric(${p}, ${s})`, required, String(defaultValue));

export const datetime = (required: boolean = false, defaultValue?: DefaultValue): ColumnSpec => column('timestamptz', required, defaultValue);

export const date = (required: boolean = false, defaultValue?: DefaultValue): ColumnSpec => column('date', required, defaultValue);

// varchar + CHECK instead of a PostgreSQL enum type: self-contained and easy to alter in a later migration
export const enumType = (values: string[] = [], required: boolean = false, defaultValue?: string): ColumnSpec => {
  if (!values.length) throw new Error('enumType needs at least one value');
  const length = Math.max(64, ...values.map((value) => value.length));
  return column(`varchar(${length})`, required, defaultValue, (col, name) =>
    col.check(sql`${sql.ref(name)} in (${sql.join(values.map((value) => sql.lit(value)))})`));
};

export const jsonType = (required: boolean = false): ColumnSpec => column('jsonb', required);

// Same-module tables only: cross-module foreign keys break module boundaries
export const foreignKey = (
  refTable: string,
  refCol: string = 'id',
  required: boolean = false,
  type: DataTypeExpression = 'uuid',
  onDelete?: OnModifyForeignAction,
  onUpdate?: OnModifyForeignAction,
): ColumnSpec =>
  column(type, required, undefined, (col) => {
    let built = col.references(`${refTable}.${refCol}`);
    if (onDelete) built = built.onDelete(onDelete);
    if (onUpdate) built = built.onUpdate(onUpdate);
    return built;
  });

export const softDeleteColumns = {
  deletedAt: datetime(),
};

// DB defaults cover inserts only; repositories must set updatedAt on every update
export const timestampColumns = {
  createdAt: datetime(true, sql`now()`),
  updatedAt: datetime(true, sql`now()`),
};
