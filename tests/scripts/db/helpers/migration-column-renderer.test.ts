import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ParsedField } from '../../../../scripts/db/helpers/migration-column-parser';
import { MigrationColumnRenderer } from '../../../../scripts/db/helpers/migration-column-renderer';

const field = (overrides: Partial<ParsedField>): ParsedField => ({
  name: 'col', type: 'string', metadata: null,
  isNullable: false, isUnique: false, isIndex: false, isUnsigned: false, defaultValue: null,
  ...overrides,
});

const render = (overrides: Partial<ParsedField>) => MigrationColumnRenderer.execute([field(overrides)])[0];

describe('MigrationColumnRenderer.execute', () => {
  const cases: Array<[string, Partial<ParsedField>, string]> = [
    ['for a string column with length, renders genericString with that length', { metadata: { length: 255 } }, 'col: MigrationUtils.genericString(true, 255)'],
    ['for a nullable string with a default, keeps an undefined length placeholder', { isNullable: true, defaultValue: 'x' }, 'col: MigrationUtils.genericString(false, undefined, "x")'],
    ['for a string default with quotes, escapes it as JSON', { defaultValue: 'a"b' }, 'col: MigrationUtils.genericString(true, undefined, "a\\"b")'],
    ['for a text column, renders text', { type: 'text' }, 'col: MigrationUtils.text(true)'],
    ['for a unique uuid column, renders uuid with unique flag', { type: 'uuid', isUnique: true }, 'col: MigrationUtils.uuid(true, true)'],
    ['for a date column, renders date', { type: 'date' }, 'col: MigrationUtils.date(true)'],
    ['for a datetime with a default, renders datetime with that default', { type: 'datetime', defaultValue: 'NOW' }, 'col: MigrationUtils.datetime(true, "NOW")'],
    ['for a decimal column, renders precision, scale and default', { type: 'decimal', metadata: { precision: 10, scale: 2 }, defaultValue: 0 }, 'col: MigrationUtils.decimal(true, 10, 2, 0)'],
    ['for a float column, maps to decimal', { type: 'float' }, 'col: MigrationUtils.decimal(true)'],
    ['for a double column, maps to decimal', { type: 'double', isNullable: true }, 'col: MigrationUtils.decimal(false)'],
    ['for an integer with a default, renders integer with that default', { type: 'integer', defaultValue: 3 }, 'col: MigrationUtils.integer(true, 3)'],
    ['for a biginteger with a default, emits a bigint literal', { type: 'biginteger', defaultValue: 5 }, 'col: MigrationUtils.bigInteger(true, 5n)'],
    ['for an enum column, renders its values', { type: 'enum', metadata: { enumValues: ['a', 'b'] }, isNullable: true }, 'col: MigrationUtils.enumType(["a","b"], false)'],
    ['for an enum without values, renders an empty list', { type: 'enum' }, 'col: MigrationUtils.enumType([], true)'],
  ];

  for (const [label, overrides, expected] of cases) {
    it(label, () => {
      assert.equal(render(overrides), expected);
    });
  }

  it('given several columns, renders one line per column in order', () => {
    const lines = MigrationColumnRenderer.execute([field({ name: 'a' }), field({ name: 'b', type: 'text' })]);
    assert.deepEqual(lines, ['a: MigrationUtils.genericString(true)', 'b: MigrationUtils.text(true)']);
  });

  it('for an unknown type, throws', () => {
    assert.throws(() => render({ type: 'blob' }), /Unknown field type: blob at col/);
  });

  it('for a non-numeric integer default, throws', () => {
    assert.throws(() => render({ type: 'integer', defaultValue: 'abc' }), /Invalid integer default/);
  });

  it('for a fractional biginteger default, throws', () => {
    assert.throws(() => render({ type: 'biginteger', defaultValue: 1.5 }), /Invalid biginteger default/);
  });
});
