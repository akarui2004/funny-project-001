import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MigrationColumnParser } from '../../../../scripts/db/helpers/migration-column-parser';

const parse = (schema: string) => MigrationColumnParser.execute(schema);

describe('MigrationColumnParser.execute', () => {
  it('parses a plain column with defaults', () => {
    assert.deepEqual(parse('title:text'), [{
      name: 'title', type: 'text', metadata: null,
      isNullable: false, isUnique: false, isIndex: false, isUnsigned: false, defaultValue: null,
    }]);
  });

  it('lowercases the type', () => {
    assert.equal(parse('name:STRING')[0]?.type, 'string');
  });

  it('parses a length argument', () => {
    assert.deepEqual(parse('username:string(255)')[0]?.metadata, { length: 255 });
  });

  it('parses decimal precision/scale and chained modifiers', () => {
    const [field] = parse('price:decimal(10,2):unsigned:default[0.00]:index');
    assert.deepEqual(field?.metadata, { precision: 10, scale: 2 });
    assert.equal(field?.isUnsigned, true);
    assert.equal(field?.isIndex, true);
    assert.equal(field?.defaultValue, 0);
  });

  it('parses enum values and nullable/unique', () => {
    const [field] = parse('status:enum[a, b,c]:nullable:unique');
    assert.deepEqual(field?.metadata, { enumValues: ['a', 'b', 'c'] });
    assert.equal(field?.isNullable, true);
    assert.equal(field?.isUnique, true);
  });

  it('keeps non-numeric defaults as strings and empty default as null', () => {
    assert.equal(parse('a:string:default[hello]')[0]?.defaultValue, 'hello');
    assert.equal(parse('a:string:default[]')[0]?.defaultValue, null);
  });

  it('splits multiple columns even when metadata contains commas', () => {
    const fields = parse('price:decimal(10,2), name:string , age:integer');
    assert.deepEqual(fields.map((f) => f.name), ['price', 'name', 'age']);
  });

  it('returns an empty list for an empty schema', () => {
    assert.deepEqual(parse(''), []);
  });

  const invalid: Array<[string, RegExp]> = [
    ['a:string,,b:integer', /Invalid column definition/],
    ['1a:string', /Invalid column definition/],
    ['a:string junk', /Invalid column definition/],
    ['a:string:foo', /Unknown column modifier: "foo"/],
    ['a:string(abc)', /Invalid string length/],
    ['a:decimal(10,x)', /Invalid decimal precision\/scale/],
  ];

  for (const [schema, error] of invalid) {
    it(`throws for "${schema}"`, () => {
      assert.throws(() => parse(schema), error);
    });
  }
});
