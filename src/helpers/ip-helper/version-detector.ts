import net from 'net';

export const IP_VERSION = { INVALID: 0, V4: 4, V6: 6 } as const;

export type IPVersionNumber = (typeof IP_VERSION)[keyof typeof IP_VERSION];

const CIDR_REGEX = /^(0|[1-9]\d{0,2})$/;
const MAX_CIDR_V4 = 32;
const MAX_CIDR_V6 = 128;

/**
 * Detect the version of a single IP or an "ip/prefix" CIDR string.
 * IPv6 zone ids ("fe80::1%eth0") are rejected: they are interface-scoped, so
 * the numeric parsers cannot represent them.
 */
export const getIPVersion = (input: string): IPVersionNumber => {
  if (input.includes('%')) return IP_VERSION.INVALID;

  const slashIndex = input.indexOf('/');

  // Pure IP without CIDR subnet
  if (slashIndex === -1) {
    return (net.isIP(input) as IPVersionNumber) || IP_VERSION.INVALID;
  }

  // More than 1 slash in the IP input string
  if (input.indexOf('/', slashIndex + 1) !== -1) {
    return IP_VERSION.INVALID;
  }

  const version = net.isIP(input.slice(0, slashIndex)) as IPVersionNumber;
  if (!version) return IP_VERSION.INVALID;

  // Check the pattern of the CIDR prefix, then its range for this version
  const cidrStr = input.slice(slashIndex + 1);
  if (!CIDR_REGEX.test(cidrStr)) return IP_VERSION.INVALID;

  const maxPrefix = version === IP_VERSION.V4 ? MAX_CIDR_V4 : MAX_CIDR_V6;
  return Number(cidrStr) <= maxPrefix ? version : IP_VERSION.INVALID;
};
