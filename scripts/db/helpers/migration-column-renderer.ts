import { FieldMetadata, ParsedField } from './migration-column-parser';

/**
 * A single argument emitted into a `MigrationUtils.X(...)` call expression.
 *  - `boolean` / `number` render as JS literals (`true`, `10`).
 *  - `string` is JSON-serialized so quotes/escapes stay valid in the generated source.
 */
type SegmentOption = string | number | boolean;

interface TypeRenderer {
  /** Name of the helper on `MigrationUtils` to invoke. */
  method: string;
  /** Push the typed args for this column kind into `opts`, in declaration order. */
  pushArgs: (field: ParsedField, opts: SegmentOption[]) => void;
}

/** True when the column is required (i.e. NOT nullable). */
const requiredFlag = (isNullable: boolean): boolean => isNullable === false;

/**
 * Render a `ParsedField[]` (from `MigrationColumnParser`) into one source line per
 * column, ready for Mustache injection into `migration.mustache`.
 *
 * Example output line:
 *   `price: MigrationUtils.decimal(true, 10, 2, BigNumber(0))`
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

    const opts: SegmentOption[] = [];
    config.pushArgs(field, opts);
    return `MigrationUtils.${config.method}(${opts.join(',')})`;
  }

  private static readonly TYPES: Record<string, TypeRenderer> = {
    string: {
      method: 'genericString',
      pushArgs: ({ isNullable, metadata, defaultValue }, opts) => {
        if (requiredFlag(isNullable)) opts.push(true);
        if (metadata?.length) opts.push(metadata.length);
        if (defaultValue != null) opts.push(JSON.stringify(defaultValue));
      },
    },
    text: {
      method: 'text',
      pushArgs: ({ isNullable }, opts) => {
        if (requiredFlag(isNullable)) opts.push(true);
      },
    },
    uuid: {
      method: 'uuid',
      pushArgs: ({ isNullable, isUnique }, opts) => {
        if (requiredFlag(isNullable)) opts.push(true);
        if (isUnique) opts.push(true);
      },
    },
    date: {
      method: 'date',
      pushArgs: ({ isNullable, defaultValue }, opts) => {
        if (requiredFlag(isNullable)) opts.push(true);
        if (defaultValue != null) opts.push(JSON.stringify(defaultValue));
      },
    },
    dateTime: {
      method: 'datetime',
      pushArgs: ({ isNullable, defaultValue }, opts) => {
        if (requiredFlag(isNullable)) opts.push(true);
        if (defaultValue != null) opts.push(JSON.stringify(defaultValue));
      },
    },
    decimal: sharedDecimal(),
    float: sharedDecimal(),
    double: sharedDecimal(),
    integer: sharedWithDefault('integer'),
    bigInteger: sharedWithDefault('bigInteger'),
    enum: {
      method: 'enumType',
      pushArgs: ({ metadata, isNullable, defaultValue }, opts) => {
        opts.unshift(JSON.stringify(metadata?.enumValues ?? []));
        opts.push(!isNullable);
        if (defaultValue != null) opts.push(JSON.stringify(defaultValue));
      },
    },
  };
}

/**
 * Shared config for decimal/float/double — all take `(required, precision, scale, BigNumber(default))`.
 * The required flag is always emitted so positional args stay aligned even when the column is nullable.
 * Default value is wrapped with `BigNumber(...)` to match `MigrationUtils.decimal`'s call site,
 * which expects a BigNumber instance, not a primitive number.
 */
function sharedDecimal(): TypeRenderer {
  return {
    method: 'decimal',
    pushArgs: ({ isNullable, metadata, defaultValue }: ParsedField & { metadata: FieldMetadata | null }, opts) => {
      opts.push(!isNullable);
      if (metadata?.precision != null) opts.push(metadata.precision);
      if (metadata?.scale != null) opts.push(metadata.scale);
      if (defaultValue != null) opts.push(`BigNumber(${defaultValue})`);
    },
  };
}

/** Shared config for integer / bigInteger — both take `(required, default)`. */
function sharedWithDefault(method: string): TypeRenderer {
  return {
    method,
    pushArgs: ({ isNullable, defaultValue }, opts) => {
      opts.push(!isNullable);
      if (defaultValue != null) opts.push(defaultValue);
    },
  };
}
