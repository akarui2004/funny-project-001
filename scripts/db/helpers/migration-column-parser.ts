import { z } from 'zod';

// Shape of a single column's raw regex capture groups, before type-aware parsing.
const RAW_COLUMN_SCHEMA = z.object({
  fieldName: z.string().regex(/^[a-zA-Z_]\w*$/, 'Invalid field name'),
  fieldType: z.string().regex(/^\w+$/, 'Invalid field type'),
  fieldMetadata: z.string().optional(),
  fieldModifiers: z.string().optional(),
});

type TRawColumn = z.infer<typeof RAW_COLUMN_SCHEMA>;

export interface FieldMetadata {
  length?: number;
  precision?: number;
  scale?: number;
  enumValues?: string[];
}

export interface ParsedField {
  name: string;
  type: string;
  metadata: FieldMetadata | null;
  isNullable: boolean;
  isUnique: boolean;
  isIndex: boolean;
  isUnsigned: boolean;
  defaultValue: string | number | boolean | null;
}

/**
 * Parses a `--columns` CLI value (comma-separated column definitions) into
 * structured `ParsedField`s ready to feed the migration template.
 *
 * Grammar: `name:type[(meta)|[meta]][:modifier]*`
 * Examples:
 *   username:string(255)
 *   price:decimal(10,2):unsigned:default[0.00]:index
 *   status:enum[a,b,c]:nullable
 *
 * Parsing is all-or-nothing: the first malformed column throws immediately,
 * so a migration file is never generated from a partially-parsed schema.
 */
export class MigrationColumnParser {
  private static readonly FIELD_NAME = '(?<fieldName>[a-zA-Z_]\\w*)';
  private static readonly FIELD_TYPE = ':(?<fieldType>\\w+)';

  // Captures arguments inside parens or brackets: (255), (10,2), [a,b,c]
  private static readonly METADATA = '(?:[\\(\\[](?<fieldMetadata>[^\\]\\)]+)[\\)\\]])?';

  // Captures all trailing chained modifiers (e.g., :unsigned:nullable:index)
  private static readonly MODIFIERS = '(?<fieldModifiers>(?::[^\\s,]+)*)?';

  // Not anchored, global: scans the whole schema for column definitions.
  // Metadata (e.g. `decimal(10,2)`) may itself contain commas, so columns
  // can't just be `.split(',')` — the regex has to walk the string instead.
  private static readonly COLUMN_REGEX = new RegExp(
    `${this.FIELD_NAME}${this.FIELD_TYPE}${this.METADATA}${this.MODIFIERS}`,
    'g'
  );

  // What's allowed between two matched columns: optional whitespace, one comma, optional whitespace.
  private static readonly SEPARATOR_REGEX = /^\s*,?\s*$/;

  private static readonly DEFAULT_MODIFIER_REGEX = /^default\[(?<value>[^\]]*)\]$/;
  private static readonly BOOLEAN_MODIFIERS = new Set(['nullable', 'unique', 'index', 'unsigned']);

  /**
   * Parses a full `--columns` value, e.g. "a:string,b:integer:index".
   * Throws on the first invalid/unrecognized column so callers never receive
   * a partial result (a leftover chunk the regex couldn't match is a typo,
   * not something to silently skip).
   */
  public static execute(schema: string): ParsedField[] {
    const parsedFields: ParsedField[] = [];
    let cursor = 0;

    for (const match of schema.matchAll(this.COLUMN_REGEX)) {
      this.assertSeparator(schema.slice(cursor, match.index));
      parsedFields.push(this.buildField(this.validateSchema(match.groups)));
      cursor = match.index + match[0].length;
    }

    this.assertSeparator(schema.slice(cursor));

    return parsedFields;
  }

  private static assertSeparator(gap: string): void {
    if (!this.SEPARATOR_REGEX.test(gap)) {
      throw new Error(`Invalid column definition near: "${gap.trim()}"`);
    }
  }

  private static buildField(rawColumn: TRawColumn): ParsedField {
    return {
      name: rawColumn.fieldName,
      type: rawColumn.fieldType.toLowerCase(),
      metadata: this.parseMetadata(rawColumn.fieldType, rawColumn.fieldMetadata),
      ...this.parseModifiers(rawColumn.fieldModifiers),
    };
  }

  private static validateSchema(rawData: unknown): TRawColumn {
    const result = RAW_COLUMN_SCHEMA.safeParse(rawData);
    if (!result.success) {
      throw new Error(result.error.message);
    }

    return result.data;
  }

  /**
   * Turns the raw `(...)`/`[...]` metadata capture into a typed shape based
   * on the column type: enum -> values list, decimal/float/double ->
   * precision+scale, everything else -> a single length argument.
   */
  private static parseMetadata(fieldType: string, rawMetadata?: string): FieldMetadata | null {
    if (!rawMetadata) return null;

    const type = fieldType.toLowerCase();
    const parts = rawMetadata.split(',').map((part) => part.trim());

    if (type === 'enum') {
      return { enumValues: parts };
    }

    if (type === 'decimal' || type === 'float' || type === 'double') {
      const [precision, scale] = parts.map((part) => this.toNumber(part, `${fieldType} precision/scale`));
      return { precision, scale };
    }

    return { length: this.toNumber(parts[0] ?? '', `${fieldType} length`) };
  }

  /** Splits the raw `:mod1:mod2:...` chain into boolean flags + a default value. */
  private static parseModifiers(rawModifiers?: string) {
    const tokens = (rawModifiers ?? '').split(':').filter(Boolean);

    const flags = { isNullable: false, isUnique: false, isIndex: false, isUnsigned: false };
    let defaultValue: string | number | null = null;

    for (const token of tokens) {
      const defaultMatch = token.match(this.DEFAULT_MODIFIER_REGEX);
      if (defaultMatch) {
        defaultValue = this.parseDefaultValue(defaultMatch.groups?.value ?? '');
        continue;
      }

      if (!this.BOOLEAN_MODIFIERS.has(token)) {
        throw new Error(`Unknown column modifier: "${token}"`);
      }

      if (token === 'nullable') flags.isNullable = true;
      if (token === 'unique') flags.isUnique = true;
      if (token === 'index') flags.isIndex = true;
      if (token === 'unsigned') flags.isUnsigned = true;
    }

    return { ...flags, defaultValue };
  }

  private static parseDefaultValue(raw: string): string | number | null {
    if (raw === '') return null;
    const numeric = Number(raw);
    return Number.isNaN(numeric) ? raw : numeric;
  }

  private static toNumber(raw: string, label: string): number {
    const value = Number(raw);
    // Number('') is 0, not NaN — reject blanks explicitly so they don't
    // silently become a valid "0" length/precision/scale.
    if (raw.trim() === '' || Number.isNaN(value)) {
      throw new Error(`Invalid ${label}: "${raw}"`);
    }
    return value;
  }
}
