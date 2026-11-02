import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getIPVersion } from 'src/helpers/ip-resolver';
import { GET_IP_VERSION_CASES } from 'tests/test-cases/get-ip-version-test-cases';

describe('getIPVersion', () => {
  for (const [input, expected] of GET_IP_VERSION_CASES) {
    it(`given "${input}", returns ${expected ? `IPv${expected}` : 'not an IP (0)'}`, () => {
      assert.equal(getIPVersion(input), expected);
    });
  }
});
