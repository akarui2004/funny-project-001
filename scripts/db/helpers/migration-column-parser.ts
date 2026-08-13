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
    const matches = schema.matchAll(this.MIGRATION_REGEX);

    for (const match of matches) {
      console.log(match, 3002);
    }
    console.log(matches, 3001);
  }
}

const input = "username:string(255), password:string, price:decimal(10,2):unsigned:default[0.00]:index, status:enum[a,b,c]:nullable";
MigrationColumnParser.execute(input);