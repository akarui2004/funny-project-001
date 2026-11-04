import type { IPv4AddressInfo } from 'src/types';
import { splitCidr } from './split-cidr';
import { getIPVersion, IP_VERSION } from './version-detector';

const IPV4_BITS = 32;
const CHAR_CODE_DOT = 46;
const CHAR_CODE_ZERO = 48;

export const parseIPv4 = (input: string): IPv4AddressInfo => {
  const trimmedInput = input.trim();
  if (getIPVersion(trimmedInput) !== IP_VERSION.V4) {
    throw new Error(`Input must be an IP Version 4, got "${trimmedInput}"`);
  }

  const { ip, maskBits, isCidr } = splitCidr(trimmedInput, IPV4_BITS);
  const ipNum = ipv4ToNumber(ip);

  // `<<` is taken modulo 32, so a /0 mask needs its own branch
  const mask = maskBits === 0 ? 0 : (~0 << (IPV4_BITS - maskBits)) >>> 0;
  const minNum = (ipNum & mask) >>> 0;
  const maxNum = (minNum | ~mask) >>> 0;

  return {
    input: trimmedInput,
    ip,
    cidr: `${ip}/${maskBits}`,
    maskBits,
    isCidr,
    minNum,
    maxNum,
    minIP: numberToIPv4(minNum),
    maxIP: numberToIPv4(maxNum),
    totalIPs: 2 ** (IPV4_BITS - maskBits),
  };
};

/**
 * Convert a dotted-quad string to an unsigned 32-bit number.
 * Precondition: `ip` is a valid IPv4 (checked with `getIPVersion`); the
 * char-code loop does no validation and returns garbage for other input.
 */
export const ipv4ToNumber = (ip: string): number => {
  let num = 0;
  let octet = 0;

  for (let i = 0; i < ip.length; i++) {
    const code = ip.charCodeAt(i);
    if (code === CHAR_CODE_DOT) {
      num = ((num << 8) | octet) >>> 0;
      octet = 0;
    } else {
      // digit char code -> number, without parseInt
      octet = octet * 10 + (code - CHAR_CODE_ZERO);
    }
  }

  return ((num << 8) | octet) >>> 0;
};

export const numberToIPv4 = (num: number): string =>
  `${num >>> 24}.${(num >>> 16) & 255}.${(num >>> 8) & 255}.${num & 255}`;
