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

export const IP_VERSION = {
  INVALID: 0,
  V4: 4,
  V6: 6,
};

export type IpVersionNumber = (typeof IP_VERSION)[keyof typeof IP_VERSION];
export type IpVersionName = keyof typeof IP_VERSION;

abstract class IPResolver {
  static readonly CIDR_REGEX = /^(0|[1-9]\d{0,2})$/;
  static readonly MAX_CIDR_V4 = 32;
  static readonly MAX_CIDR_V6 = 128;

  // Prevent the instantiation
  private constructor() { }

  static identifyVersion(input: string): number {
    const [ip = '', cidr, ...rest] = input.split('/');
    const version = net.isIP(ip) as IpVersionNumber;

    if (!version || rest.length) return IP_VERSION.INVALID;
    if (cidr === undefined) return version;

    const max = version === IP_VERSION.V4 ? this.MAX_CIDR_V4 : this.MAX_CIDR_V6;
    const isValidCidr = this.CIDR_REGEX.test(cidr) && Number(cidr) <= max;

    return isValidCidr ? version : IP_VERSION.INVALID;
  }

  static matchIPRules(input: string, rules: string[]): boolean {
    // TODO: Implement later after the node:test
    return true;
  }
}

export default IPResolver;
