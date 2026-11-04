import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { bigIntToIPv6, getMappedIPv4, ipv6ToBigInt, parseIPv6 } from 'src/helpers';

describe('parseIPv6', () => {
  it('given a CIDR, returns range, capacity and normalized cidr', () => {
    const info = parseIPv6('2001:db8::1/32');
    assert.equal(info.minIP, '2001:db8::');
    assert.equal(info.maxIP, '2001:db8:ffff:ffff:ffff:ffff:ffff:ffff');
    assert.equal(info.totalIPs, 1n << 96n);
    assert.equal(info.cidr, '2001:db8::1/32');
  });

  it('without a prefix, treats the address as a /128 host', () => {
    const info = parseIPv6('::1');
    assert.equal(info.isCidr, false);
    assert.equal(info.minNum, info.maxNum);
    assert.equal(info.totalIPs, 1n);
  });

  it('for a /0 prefix, spans the whole IPv6 space', () => {
    const info = parseIPv6('fe80::1/0');
    assert.equal(info.minIP, '::');
    assert.equal(info.maxIP, 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff');
  });

  it('given an IPv4 or malformed input, throws', () => {
    assert.throws(() => parseIPv6('1.2.3.4'), /IP Version 6/);
    assert.throws(() => parseIPv6('fe80::1%eth0'), /IP Version 6/);
  });
});

describe('ipv6ToBigInt', () => {
  it('for "::", returns 0', () => assert.equal(ipv6ToBigInt('::'), 0n));
  it('for "::1", returns 1', () => assert.equal(ipv6ToBigInt('::1'), 1n));
  it('for "1::", sets only the top hextet', () => assert.equal(ipv6ToBigInt('1::'), 1n << 112n));

  it('how upper and lower case hex give the same value', () => {
    assert.equal(ipv6ToBigInt('ABCD::EF'), ipv6ToBigInt('abcd::ef'));
  });

  it('given an embedded IPv4 tail, maps it to the low 32 bits', () => {
    assert.equal(ipv6ToBigInt('::ffff:1.2.3.4'), 0xffff01020304n);
    assert.equal(ipv6ToBigInt('::1.2.3.4'), 0x01020304n);
    assert.equal(ipv6ToBigInt('64:ff9b::192.0.2.33'), ipv6ToBigInt('64:ff9b::c000:221'));
  });

  it('given a fully expanded address, equals its compressed form', () => {
    assert.equal(ipv6ToBigInt('2001:0db8:0000:0000:0000:0000:0000:0001'), ipv6ToBigInt('2001:db8::1'));
  });
});

describe('bigIntToIPv6', () => {
  const cases: Array<[bigint, string]> = [
    [0n, '::'],
    [1n, '::1'],
    [(1n << 128n) - 1n, 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff'],
    [ipv6ToBigInt('2001:db8:0:0:1:0:0:1'), '2001:db8::1:0:0:1'], // first of two equal runs wins
    [ipv6ToBigInt('2001:db8:0:1:1:1:1:1'), '2001:db8:0:1:1:1:1:1'], // single zero is not compressed
    [ipv6ToBigInt('1:0:0:2:0:0:0:3'), '1:0:0:2::3'], // longest run wins
  ];

  for (const [num, expected] of cases) {
    it(`given 0x${num.toString(16)}, formats as ${expected}`, () => {
      assert.equal(bigIntToIPv6(num), expected);
    });
  }

  it('given a value outside 128 bits, throws RangeError', () => {
    assert.throws(() => bigIntToIPv6(-1n), RangeError);
    assert.throws(() => bigIntToIPv6(1n << 128n), RangeError);
  });
});

describe('getMappedIPv4', () => {
  it('given an IPv4-mapped address, returns the embedded IPv4 number', () => {
    assert.equal(getMappedIPv4(ipv6ToBigInt('::ffff:1.2.3.4')), 0x01020304);
  });

  it('for any other IPv6 address, returns null', () => {
    assert.equal(getMappedIPv4(ipv6ToBigInt('2001:db8::1')), null);
    assert.equal(getMappedIPv4(ipv6ToBigInt('::1.2.3.4')), null);
  });
});
