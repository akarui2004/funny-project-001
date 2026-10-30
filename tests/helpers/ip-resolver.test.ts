import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import IPResolver from 'src/helpers/ip-resolver';

describe('IPResolver.identifyVersion', () => {
  const cases: Array<[string, number]> = [
    ['192.168.1.1', 4],
    ['192.168.1.0/24', 4],
    ['10.0.0.0/0', 4],
    ['10.0.0.0/32', 4],
    ['10.0.0.0/33', 0],     // out of max CIDR v4
    ['10.0.0.0/024', 0],    // deny leading zero
    ['::1', 6],
    ['2001:db8::/32', 6],
    ['2001:db8::/128', 6],
    ['2001:db8::/129', 0],  // out of max CIDR v6
    ['1.2.3.4/24/8', 0],    // more than one '/'
    ['not-an-ip', 0],
    ['', 0],
  ];

  for (const [input, expected] of cases) {
    it(`"${input}" → ${expected}`, () => {
      assert.equal(IPResolver.identifyVersion(input), expected);
    });
  }
});