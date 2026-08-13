import { z } from 'zod';

const PARSED_FIELD_SCHEMA = z.object({
  fieldName: z.string().regex(/^[a-zA-Z_]\w*$/, 'Invalid field name'),
  fieldType: z.string().regex(/^\w+$/, 'Invalid field type'),
  fieldMetadata: z.string().optional(),
  fieldModifiers: z.string().optional(),
});

type TParsedFieldSchema = z.infer<typeof PARSED_FIELD_SCHEMA>;

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
  defaultValue: string | number | null;
}

export class MigrationColumnParser {
  private static readonly FIELD_NAME = '(?<fieldName>[a-zA-Z_]\\w*)';
  private static readonly FIELD_TYPE = ':(?<fieldType>\\w+)';

  // Captures arguments inside parens or brackets: (255), (10,2), [a,b,c]
  private static readonly METADATA = '(?:[\\(\\[](?<fieldMetadata>[^\\]\\)]+)[\\)\\]])?';

  // Captures all trailing chained modifiers up to a comma or whitespace (e.g., :unsigned:nullable:index)
  private static readonly MODIFIERS = '(?<fieldModifiers>(?::[^\\s,]+)*)?';

  private static readonly MIGRATION_REGEX = new RegExp(
    `${this.FIELD_NAME}${this.FIELD_TYPE}${this.METADATA}${this.MODIFIERS}`,
    'g'
  );

  public static execute(schema: string) {
    const matchedItems = schema.matchAll(this.MIGRATION_REGEX);
    const parsedFields: ParsedField[] = [];

    for (const matchedItem of matchedItems) {
      const parsedMatchedItem = this.validateSchema(matchedItem.groups);
    }
  }

  private static validateSchema(rawData: unknown): TParsedFieldSchema {
    const result = PARSED_FIELD_SCHEMA.safeParse(rawData);
    if (!result.success) {
      throw new Error(result.error.message);
    }

    return result.data;
  }
}

// const input = "username:string(255), password:string, price:decimal(10,2):unsigned:default[0.00]:index, status:enum[a,b,c]:nullable";
// const failedInput = ":";
// MigrationColumnParser.execute(failedInput);
