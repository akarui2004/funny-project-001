/**
 * This is the class for IPv4 and IPv6
 *
 *  1. Detect the input IP is the v4 or v6
 *  2. Convert the IPv4 and IPv6 to Integer and Big Integer
 *
 *  For a single IPv4 and IPv6, we split the string into segments by '.' or ':', then we
 *  shift the bits for every segment. After that, we combine into a single number. Remember
 *  to cast to an Unsigned Integer for IPv4, and use Big Integer for IPv6
 *
 *  For a CIDR (subnet range), we split the IP and Prefix separately, then we convert the IP
 *  to a number. Next, we create a bitmask based on the Prefix, using the '&' operator to find
 *  the start IP, and the '|' operator to find the end IP
 */

import net from 'net';

export const IP_VERSION = { INVALID: 0, V4: 4, V6: 6 } as const;

export type IpVersionNumber = (typeof IP_VERSION)[keyof typeof IP_VERSION];
export type IpVersionName = keyof typeof IP_VERSION;

const CIDR_REGEX = /^(0|[1-9]\d{0,2})$/;
const MAX_CIDR_V4 = 32;
const MAX_CIDR_V6 = 128;

export function getIPVersion(input: string): IpVersionNumber {
  const slashIndex = input.indexOf('/');

  // Pure IP without CIDR subnet
  if (slashIndex === -1) {
    return (net.isIP(input) as IpVersionNumber) || IP_VERSION.INVALID;
  }

  // More than 1 slash in the IP input string
  if (input.indexOf('/', slashIndex + 1) !== -1) {
    return IP_VERSION.INVALID;
  }

  const ip = input.slice(0, slashIndex);
  const version = net.isIP(ip) as IpVersionNumber;
  if (!version) return IP_VERSION.INVALID;

  // check the pattern of the CIDR prefix
  const cidrStr = input.slice(slashIndex + 1);
  if (!CIDR_REGEX.test(cidrStr)) return IP_VERSION.INVALID;

  // Check the prefix follow by version
  const maxPrefix = version === IP_VERSION.V4 ? MAX_CIDR_V4 : MAX_CIDR_V6;
  return Number(cidrStr) <= maxPrefix ? version : IP_VERSION.INVALID;
}

export function matchIPRules(input: string, rules: string[]): boolean {
  // TODO: Implement later after the node:test
  return true;
}
