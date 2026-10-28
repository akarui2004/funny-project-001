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

abstract class IPResolver {
  static readonly VERSION = {
    v4: 4,
    v6: 6,
    Invalid: 0,
  } as const;

  static readonly PREFIX_RANGE_NUM = {
    v4: [0, 32],
    v6: [0, 128],
  } as const;

  // Prevent the instantiation
  private constructor() { }

  static identifyVersion(input: string): number {
    // Return 'v4' or 'v6'; return 0 if IP invalid
    const { } = input.split('/');
    return this.VERSION.Invalid;
  }
}

export default IPResolver;
