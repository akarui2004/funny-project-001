import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getErrorMessage } from 'src/utils/get-error-message';

describe('getErrorMessage', () => {
  it('retrieve message from Error', () => {
    assert.equal(getErrorMessage(new Error('test')), 'test');
  });

  it('return string when error message is a string', () => {
    assert.equal(getErrorMessage('is a string'), 'is a string');
  })

  it('no crash with looping object', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    assert.equal(typeof getErrorMessage(circular), 'string');
  });
})