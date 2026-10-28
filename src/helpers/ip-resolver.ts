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

export type IpVersions = 'V4' | 'V6' | 'INVALID';

abstract class IPResolver {
  static readonly IP_VERSION: Record<IpVersions, number> = {
    V4: 4,
    V6: 6,
    INVALID: 0,
  };

  static readonly MAX_CIDR_V4 = 32;
  static readonly MAX_CIDR_V6 = 128;

  // Prevent the instantiation
  private constructor() { }

  static identifyVersion(input: string): number {
    const segments = input.split('/');
    if (segments.length > 2) return this.IP_VERSION.INVALID;

    const [ip = '', cidr] = segments;
    const ipVersion = net.isIP(ip);

    if (ipVersion !== this.IP_VERSION.INVALID) {
      if (cidr === undefined) return ipVersion;

      if (/^(0|[1-9]\d{0,2})$/.test(cidr)) {
        const cidrNum = Number(cidr);
        const max = ipVersion === this.IP_VERSION.V4 ? this.MAX_CIDR_V4 : this.MAX_CIDR_V6;
        if (cidrNum >= 0 && cidrNum <= max) return ipVersion;
      }
    }

    return this.IP_VERSION.INVALID;
  }

  static matchIPRule(input: string, rule: string): boolean {
    return true;
  }
}

export default IPResolver;
