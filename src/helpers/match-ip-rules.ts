import { getIPVersion, getMappedIPv4, IP_VERSION, ipv4ToNumber, ipv6ToBigInt, parseIPv4, parseIPv6 } from './ip-helper';
import { logger } from 'src/utils';

/**
 * True when the single IP `input` falls inside any IP / CIDR in `rules`.
 *
 * - Invalid input (not an IP, or carrying a CIDR) never matches.
 * - Empty `rules` never matches. "No rules means allow everyone" is a policy of
 *   the allow-list middleware, not of matching, so a blacklist can reuse this.
 * - An IPv4-mapped IPv6 input (`::ffff:a.b.c.d`) is checked against both its
 *   IPv6 rules and the IPv4 rules of the embedded address, so a dual-stack
 *   socket cannot slip past an IPv4 rule.
 * - Invalid rules are skipped with a warning.
 */
export const matchIPRules = (input: string, rules: string[] = []): boolean => {
  const ip = input.trim();
  const version = getIPVersion(ip);
  if (version === IP_VERSION.INVALID || ip.includes('/')) return false;

  let v4Num: number | null = null;
  let v6Num: bigint | null = null;
  if (version === IP_VERSION.V4) {
    v4Num = ipv4ToNumber(ip);
  } else {
    v6Num = ipv6ToBigInt(ip);
    v4Num = getMappedIPv4(v6Num);
  }

  for (const rawRule of rules) {
    const rule = rawRule.trim();
    if (!rule) continue;

    const ruleVersion = getIPVersion(rule);
    if (ruleVersion === IP_VERSION.INVALID) {
      logger.warn(`Ignoring invalid IP rule: "${rule}"`);
    } else if (ruleVersion === IP_VERSION.V4 && v4Num !== null) {
      const { minNum, maxNum } = parseIPv4(rule);
      if (v4Num >= minNum && v4Num <= maxNum) return true;
    } else if (ruleVersion === IP_VERSION.V6 && v6Num !== null) {
      const { minNum, maxNum } = parseIPv6(rule);
      if (v6Num >= minNum && v6Num <= maxNum) return true;
    }
  }

  return false;
};
