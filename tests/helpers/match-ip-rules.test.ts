import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { matchIPRules } from 'src/helpers';
import { MATCH_IP_TEST_CASES } from 'tests/test-cases/match-ip-test-cases';

describe('matchIPRules', () => {
  for (const [input, rules, expected] of MATCH_IP_TEST_CASES) {
    it(`given "${input}" and [${rules.join(', ')}], returns ${expected}`, () => {
      assert.equal(matchIPRules(input, rules), expected);
    });
  }

  it('without a rules argument, returns false', () => {
    assert.equal(matchIPRules('1.2.3.4'), false);
  });

  it('given surrounding whitespace, trims input and rules', () => {
    assert.equal(matchIPRules(' 10.0.0.1 ', [' 10.0.0.0/8 ']), true);
  });
});
