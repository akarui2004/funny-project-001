import { ParsedField } from './migration-column-parser';

export type SegmentOptionType = string | number | boolean;

export class MigrationColumnRenderer {
  public static execute(parsedColumns: ParsedField[]): string[] {
    const migrationStatements: string[] = [];

    for (const parsedColumn of parsedColumns) {
      const segment: string[] = this.buildStatement(parsedColumn, [`${parsedColumn.name}:`]);

      migrationStatements.push(segment.join(' '));
    }

    return migrationStatements;
  }

  public static buildStatement(parsedColumn: ParsedField, segment: string[]) {
    const { type, metadata, isNullable, isUnique, isIndex, isUnsigned, defaultValue } = parsedColumn;
    const { length, precision, scale, enumValues } = metadata ?? {};

    const segmentOpts: SegmentOptionType[] = [];
    if (isNullable === false) segmentOpts.push('true');

    switch (type) {
      case 'string':
        if (length) segmentOpts.push(Number(length));
        if (defaultValue) segmentOpts.push(`'${defaultValue}'`);

        segment.push(`MigrationUtils.genericString(${segmentOpts.join(',')})`);
        break;
      case 'text':
        segment.push(`MigrationUtils.text(${segmentOpts.join(',')})`);
        break;
      case 'uuid':
        if (isUnique) segmentOpts.push(`'${isUnique}'`);

        segment.push(`MigrationUtils.uuid(${segmentOpts.join(',')})`);
        break;
      case 'date':
        if (defaultValue) segmentOpts.push(`'${defaultValue}'`);

        segment.push(`MigrationUtils.date(${segmentOpts.join(',')})`);
        break;
      case 'dateTime':
        if (defaultValue) segmentOpts.push(`'${defaultValue}'`);

        segment.push(`MigrationUtils.datetime(${segmentOpts.join(',')})`);
        break;
      case 'decimal':
      case 'float':
      case 'double':
        break;
      case 'integer':
        break;
      case 'bigInteger':
        break;
      case 'enum':
        if (enumValues && enumValues?.length > 0) segmentOpts.unshift(`${JSON.stringify(enumValues).replaceAll('"', "'")}`);
        if (isNullable === true) segmentOpts.push('false');
        if (defaultValue) segmentOpts.push(`'${defaultValue}'`);

        segment.push(`MigrationUtils.enumType(${segmentOpts.join(',')})`);
        break;
      default:
        throw new Error(`Unknown field type: ${type} at ${parsedColumn.name}`);
    }

    return segment;
  }
}
