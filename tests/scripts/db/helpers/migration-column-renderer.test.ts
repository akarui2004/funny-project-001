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
    ['string with length', { metadata: { length: 255 } }, 'col: MigrationUtils.genericString(true, 255)'],
    ['nullable string keeps undefined placeholder before default', { isNullable: true, defaultValue: 'x' }, 'col: MigrationUtils.genericString(false, undefined, "x")'],
    ['string default is JSON-quoted', { defaultValue: 'a"b' }, 'col: MigrationUtils.genericString(true, undefined, "a\\"b")'],
    ['text', { type: 'text' }, 'col: MigrationUtils.text(true)'],
    ['uuid unique', { type: 'uuid', isUnique: true }, 'col: MigrationUtils.uuid(true, true)'],
    ['date', { type: 'date' }, 'col: MigrationUtils.date(true)'],
    ['datetime with default', { type: 'datetime', defaultValue: 'NOW' }, 'col: MigrationUtils.datetime(true, "NOW")'],
    ['decimal', { type: 'decimal', metadata: { precision: 10, scale: 2 }, defaultValue: 0 }, 'col: MigrationUtils.decimal(true, 10, 2, 0)'],
    ['float maps to decimal', { type: 'float' }, 'col: MigrationUtils.decimal(true)'],
    ['double maps to decimal', { type: 'double', isNullable: true }, 'col: MigrationUtils.decimal(false)'],
    ['integer with default', { type: 'integer', defaultValue: 3 }, 'col: MigrationUtils.integer(true, 3)'],
    ['biginteger emits bigint literal', { type: 'biginteger', defaultValue: 5 }, 'col: MigrationUtils.bigInteger(true, 5n)'],
    ['enum', { type: 'enum', metadata: { enumValues: ['a', 'b'] }, isNullable: true }, 'col: MigrationUtils.enumType(["a","b"], false)'],
    ['enum without values', { type: 'enum' }, 'col: MigrationUtils.enumType([], true)'],
  ];

  for (const [label, overrides, expected] of cases) {
    it(label, () => {
      assert.equal(render(overrides), expected);
    });
  }

  it('renders one line per column in order', () => {
    const lines = MigrationColumnRenderer.execute([field({ name: 'a' }), field({ name: 'b', type: 'text' })]);
    assert.deepEqual(lines, ['a: MigrationUtils.genericString(true)', 'b: MigrationUtils.text(true)']);
  });

  it('throws on an unknown type', () => {
    assert.throws(() => render({ type: 'blob' }), /Unknown field type: blob at col/);
  });

  it('throws on a non-numeric integer default', () => {
    assert.throws(() => render({ type: 'integer', defaultValue: 'abc' }), /Invalid integer default/);
  });

  it('throws on a fractional biginteger default', () => {
    assert.throws(() => render({ type: 'biginteger', defaultValue: 1.5 }), /Invalid biginteger default/);
  });
});
