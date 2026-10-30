/**
 * Public-facing app
 * Block known spam, brute-force and abusive IPs
 * Combine with rate-limit to auto-ban
 *
 * Blacklist cases to support
 * |        TYPE        |       EXAMPLE         |         MATCH METHOD        |
 * |  Single IPv4       | 192.168.1.100         | String compare/normalize    |
 * |  IPv4 CIDR         | 192.168.1.0/24        | Bitmask compare             |
 * |  Single IPv6       | ::1                   | Normalize then compare      |
 * |  IPv6 CIDR         | 2001:db8::/32         | Bitmask compare             |
 * |  Wildcard          | 192.168.*.*           | Convert to regex            |
 * |  IPv4-mapped IPv6  | ::ffff:192.168.1.1    | Normalize to IPv4           |
 */

export function ipBlacklist(blockedCidrs: string[]) {
  //  1. retrieve the IP from request, headers, and server headers by using express
  //  2. normalized IP from (1) to real IPv4, or real IPv6
  //  3. compare with these matching
  //    3.1 compare with single IPv4/IPv6
  //    3.2 compare with IPv4/IPv6 CIDR
  //    3.3 compare with wildcard regex pattern
  //  4. should have a function to detect it is IPv4 or IPv6 -> should create helper function
}
