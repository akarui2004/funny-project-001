import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Request } from 'express';
import { getClientIp } from 'src/utils/get-client-ip';

const req = (fields: { ip?: string; ips?: string[]; remote?: string; headers?: Record<string, string> }): Request =>
  ({
    ip: fields.ip,
    ips: fields.ips ?? [],
    headers: fields.headers ?? {},
    socket: { remoteAddress: fields.remote },
  }) as unknown as Request;

describe('getClientIp', () => {
  it('given a plain connection, returns the socket peer as the client', () => {
    assert.deepEqual(getClientIp(req({ ip: '203.0.113.9', remote: '203.0.113.9' })), {
      ip: '203.0.113.9',
      socketIp: '203.0.113.9',
      forwardedChain: [],
    });
  });

  it('how a trusted proxy chain is exposed: client from req.ip, hops from req.ips, peer from the socket', () => {
    const info = getClientIp(req({ ip: '198.51.100.7', ips: ['198.51.100.7', '10.0.0.2'], remote: '10.0.0.1' }));
    assert.equal(info.ip, '198.51.100.7');
    assert.deepEqual(info.forwardedChain, ['198.51.100.7', '10.0.0.2']);
    assert.equal(info.socketIp, '10.0.0.1');
  });

  it('why forwarding headers are ignored: any client can send them', () => {
    const info = getClientIp(req({
      ip: '203.0.113.9',
      remote: '203.0.113.9',
      headers: { 'x-forwarded-for': '1.1.1.1', 'x-real-ip': '1.1.1.1', 'cf-connecting-ip': '1.1.1.1' },
    }));
    assert.equal(info.ip, '203.0.113.9');
    assert.deepEqual(info.forwardedChain, []);
  });

  it('given an IPv4-mapped IPv6 address, returns plain IPv4', () => {
    const info = getClientIp(req({ ip: '::ffff:10.0.0.5', remote: '::ffff:10.0.0.5', ips: ['::ffff:10.0.0.5'] }));
    assert.equal(info.ip, '10.0.0.5');
    assert.equal(info.socketIp, '10.0.0.5');
    assert.deepEqual(info.forwardedChain, ['10.0.0.5']);
  });

  it('given a real IPv6 address, keeps it unchanged', () => {
    assert.equal(getClientIp(req({ ip: '2001:db8::1' })).ip, '2001:db8::1');
  });

  it('for a missing or invalid address, returns null; invalid hops are dropped', () => {
    const info = getClientIp(req({ ip: 'garbage', ips: ['1.2.3.4', 'not-an-ip', '5.6.7.8/24'], remote: undefined }));
    assert.equal(info.ip, null);
    assert.equal(info.socketIp, null);
    assert.deepEqual(info.forwardedChain, ['1.2.3.4']);
    assert.equal(getClientIp(req({})).ip, null);
  });
});
