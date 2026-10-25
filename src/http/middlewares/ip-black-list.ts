/**
 * Public-facing app
 * Block IP spam, brute-force, abuse đã biết
 * Kết hợp với rate-limit để auto-ban
 *
 * Các case blacklist cần support
 * |        TYPE        |       EXAMPLE         |         MATCH METHOD        |
 * |  Single IPv4       | 192.168.1.100         | String compare/normalize    |
 * |  IPv4 CIDR         | 192.168.1.0/24        | Bitmask compare             |
 * |  Single IPv6       | ::1                   | Normalize then compare      |
 * |  IPv6 CIDR         | 2001:db8::/32         | Bitmask compare             |
 * |  Wildcard          | 192.168.*.*           | Convert to regex            |
 * |  IPv4-mapped IPv6  | ::ffff:192.168.1.1    | Normalize to IPv4           |
 */

export function ipBlacklist(blockedCidrs: string[]) { }
