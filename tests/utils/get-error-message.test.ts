import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getErrorMessage } from 'src/utils/get-error-message';

describe('getErrorMessage', () => {
  it('given an Error, returns its message', () => {
    assert.equal(getErrorMessage(new Error('test')), 'test');
  });

  it('when the error is a string, returns it as is', () => {
    assert.equal(getErrorMessage('is a string'), 'is a string');
  })

  it('given an object with a circular reference, does not crash', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    assert.equal(typeof getErrorMessage(circular), 'string');
  });
})