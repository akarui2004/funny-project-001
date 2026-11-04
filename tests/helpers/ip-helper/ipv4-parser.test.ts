import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ipv4ToNumber, numberToIPv4, parseIPv4 } from 'src/helpers';

describe('parseIPv4', () => {
  it('given a CIDR, returns range, capacity and normalized cidr', () => {
    const info = parseIPv4(' 192.168.1.77/24 ');
    assert.equal(info.isCidr, true);
    assert.equal(info.cidr, '192.168.1.77/24');
    assert.equal(info.minIP, '192.168.1.0');
    assert.equal(info.maxIP, '192.168.1.255');
    assert.equal(info.totalIPs, 256);
  });

  it('without a prefix, treats the address as a /32 host', () => {
    const info = parseIPv4('10.0.0.1');
    assert.equal(info.isCidr, false);
    assert.equal(info.minNum, info.maxNum);
    assert.equal(info.totalIPs, 1);
  });

  it('for a /0 prefix, spans the whole IPv4 space', () => {
    const info = parseIPv4('1.2.3.4/0');
    assert.equal(info.minIP, '0.0.0.0');
    assert.equal(info.maxIP, '255.255.255.255');
    assert.equal(info.totalIPs, 2 ** 32);
  });

  it('given an IPv6 or malformed input, throws', () => {
    assert.throws(() => parseIPv4('::1'), /IP Version 4/);
    assert.throws(() => parseIPv4('1.2.3.4/33'), /IP Version 4/);
  });
});

describe('ipv4ToNumber / numberToIPv4', () => {
  it('how a round trip keeps the address', () => {
    for (const ip of ['0.0.0.0', '255.255.255.255', '192.168.1.1', '1.2.3.4']) {
      assert.equal(numberToIPv4(ipv4ToNumber(ip)), ip);
    }
  });

  it('for 255.255.255.255, stays unsigned', () => {
    assert.equal(ipv4ToNumber('255.255.255.255'), 0xffffffff);
  });
});
