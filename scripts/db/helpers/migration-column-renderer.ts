import { ParsedField } from './migration-column-parser';

/**
 * A single argument emitted into a `MigrationUtils.X(...)` call expression, already
 * rendered as JS source (e.g. `true`, `10`, `"abc"`, `5n`). `undefined` marks a skipped
 * positional arg so the blueprint helper falls back to its own default.
 */
type SourceArg = string | undefined;

interface TypeRenderer {
  /** Name of the helper on `MigrationUtils` to invoke. */
  method: string;
  /** Full positional arg list matching the helper's signature in `src/db/migration-blueprint.ts`. */
  args: (field: ParsedField) => SourceArg[];
}

/** `required` flag is the inverse of the parsed `nullable` modifier. */
const required = (field: ParsedField): SourceArg => String(!field.isNullable);

/** JSON-quote string defaults so quotes/escapes stay valid in the generated source. */
const stringDefault = (field: ParsedField): SourceArg =>
  field.defaultValue == null ? undefined : JSON.stringify(String(field.defaultValue));

/** Numeric default literal; `bigint` emits a `123n` literal to match `bigInteger(…, bigint)`. */
const numericDefault = (field: ParsedField, bigint = false): SourceArg => {
  const value = field.defaultValue;
  if (value == null) return undefined;
  if (typeof value !== 'number' || (bigint && !Number.isInteger(value))) {
    throw new Error(`Invalid ${field.type} default for ${field.name}: "${value}"`);
  }
  return bigint ? `${value}n` : String(value);
};

const optionalNumber = (value?: number): SourceArg => (value == null ? undefined : String(value));

/**
 * Render a `ParsedField[]` (from `MigrationColumnParser`) into one source line per
 * column, ready for Mustache injection into `migration.mustache`.
 *
 * Example output line:
 *   `price: MigrationUtils.decimal(true, 10, 2, 0)`
 *
 * Unknown column types throw so a malformed schema never produces a partial file.
 */
export class MigrationColumnRenderer {
  public static execute(parsedColumns: ParsedField[]): string[] {
    return parsedColumns.map((column) => `${column.name}: ${MigrationColumnRenderer.render(column)}`);
  }

  private static render(field: ParsedField): string {
    const config = MigrationColumnRenderer.TYPES[field.type];
    if (!config) {
      throw new Error(`Unknown field type: ${field.type} at ${field.name}`);
    }

    // Args are positional: keep `undefined` placeholders in the middle, drop trailing ones.
    const args = config.args(field);
    while (args.length && args[args.length - 1] === undefined) args.pop();
    return `MigrationUtils.${config.method}(${args.map((arg) => arg ?? 'undefined').join(', ')})`;
  }

  // Keys are lowercase: the parser lowercases every field type.
  private static readonly TYPES: Record<string, TypeRenderer> = {
    string: {
      method: 'genericString',
      args: (f) => [required(f), optionalNumber(f.metadata?.length), stringDefault(f)],
    },
    text: { method: 'text', args: (f) => [required(f)] },
    uuid: { method: 'uuid', args: (f) => [required(f), String(f.isUnique)] },
    date: { method: 'date', args: (f) => [required(f), stringDefault(f)] },
    datetime: { method: 'datetime', args: (f) => [required(f), stringDefault(f)] },
    decimal: sharedDecimal(),
    float: sharedDecimal(),
    double: sharedDecimal(),
    integer: { method: 'integer', args: (f) => [required(f), numericDefault(f)] },
    biginteger: { method: 'bigInteger', args: (f) => [required(f), numericDefault(f, true)] },
    enum: {
      method: 'enumType',
      args: (f) => [JSON.stringify(f.metadata?.enumValues ?? []), required(f), stringDefault(f)],
    },
  };
}

/**
 * Shared config for decimal/float/double — all take `(required, precision, scale, default)`.
 * The default is a plain number: `MigrationUtils.decimal` wraps it with `BigNumber` itself.
 */
function sharedDecimal(): TypeRenderer {
  return {
    method: 'decimal',
    args: (f) => [required(f), optionalNumber(f.metadata?.precision), optionalNumber(f.metadata?.scale), numericDefault(f)],
  };
}
