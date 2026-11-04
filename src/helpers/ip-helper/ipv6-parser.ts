import type { IPv6AddressInfo } from 'src/types';
import { ipv4ToNumber } from './ipv4-parser';
import { splitCidr } from './split-cidr';
import { getIPVersion, IP_VERSION } from './version-detector';

const IPV6_BITS = 128;
const IPV6_WORDS = 8;
const MAX_IPV6 = (1n << BigInt(IPV6_BITS)) - 1n;

// ::ffff:0:0/96 — the IPv4-mapped IPv6 range
const IPV4_MAPPED_PREFIX = 0xffffn;
const IPV4_MASK = 0xffffffffn;

export const parseIPv6 = (input: string): IPv6AddressInfo => {
  const trimmedInput = input.trim();
  if (getIPVersion(trimmedInput) !== IP_VERSION.V6) {
    throw new Error(`Input must be an IP Version 6, got "${trimmedInput}"`);
  }

  const { ip, maskBits, isCidr } = splitCidr(trimmedInput, IPV6_BITS);
  const ipNum = ipv6ToBigInt(ip);

  const hostMask = (1n << BigInt(IPV6_BITS - maskBits)) - 1n;
  const minNum = ipNum & (MAX_IPV6 ^ hostMask);
  const maxNum = minNum | hostMask;

  return {
    input: trimmedInput,
    ip,
    cidr: `${ip}/${maskBits}`,
    maskBits,
    isCidr,
    minNum,
    maxNum,
    minIP: bigIntToIPv6(minNum),
    maxIP: bigIntToIPv6(maxNum),
    totalIPs: hostMask + 1n,
  };
};

/** Rewrite a trailing dotted-quad ("::ffff:1.2.3.4") as two hextets. */
const expandEmbeddedIPv4 = (ip: string): string => {
  const lastColon = ip.lastIndexOf(':');
  const tail = ip.slice(lastColon + 1);
  if (!tail.includes('.')) return ip;

  const num = ipv4ToNumber(tail);
  return `${ip.slice(0, lastColon + 1)}${(num >>> 16).toString(16)}:${(num & 0xffff).toString(16)}`;
};

/**
 * Convert an IPv6 string (with optional "::" and embedded IPv4 tail) to a
 * 128-bit bigint. Precondition: `ip` is a valid IPv6 without prefix or zone id
 * (checked with `getIPVersion`).
 */
export const ipv6ToBigInt = (ip: string): bigint => {
  const [head = '', rest] = expandEmbeddedIPv4(ip).split('::');
  const left = head ? head.split(':') : [];
  const right = rest ? rest.split(':') : [];

  // "::" stands for however many zero hextets are missing; absent "::" means none
  const zeroCount = rest === undefined ? 0 : IPV6_WORDS - left.length - right.length;
  const words = [...left, ...Array<string>(zeroCount).fill('0'), ...right];

  return words.reduce((acc, word) => (acc << 16n) | BigInt(`0x${word}`), 0n);
};

/** Format as RFC 5952: lowercase, longest zero run (>= 2 hextets) compressed to "::". */
export const bigIntToIPv6 = (num: bigint): string => {
  if (num < 0n || num > MAX_IPV6) {
    throw new RangeError(`Value must fit in ${IPV6_BITS} bits, got ${num}`);
  }

  const words = Array.from({ length: IPV6_WORDS }, (_, i) =>
    Number((num >> BigInt((IPV6_WORDS - 1 - i) * 16)) & 0xffffn).toString(16),
  );

  // Longest run of zero hextets; the first one wins a tie (RFC 5952)
  let bestStart = -1;
  let bestLen = 0;
  for (let i = 0; i < IPV6_WORDS; ) {
    if (words[i] !== '0') {
      i++;
      continue;
    }
    let end = i;
    while (end < IPV6_WORDS && words[end] === '0') end++;
    if (end - i > bestLen) {
      bestStart = i;
      bestLen = end - i;
    }
    i = end;
  }

  if (bestLen < 2) return words.join(':');
  return `${words.slice(0, bestStart).join(':')}::${words.slice(bestStart + bestLen).join(':')}`;
};

/** The embedded IPv4 number when `num` is an IPv4-mapped IPv6 (::ffff:a.b.c.d), else null. */
export const getMappedIPv4 = (num: bigint): number | null =>
  num >> 32n === IPV4_MAPPED_PREFIX ? Number(num & IPV4_MASK) : null;
