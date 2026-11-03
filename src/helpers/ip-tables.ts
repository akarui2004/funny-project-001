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

import { getIPVersion, IP_VERSION, ipV4ToNumber, ipV6ToBigInt, parseIPV4, parseIPV6 } from 'src/helpers/ip-helper';
import { getErrorMessage, logger } from 'src/utils';

export function matchIPRules(input: string, rules: string[] = []): boolean {
  // Empty or undefined rules list means unrestricted access (allow all)
  if (!rules || rules.length === 0) return true;

  const trimmedIP = input.trim();
  const ipVersion = getIPVersion(trimmedIP);
  if (ipVersion === IP_VERSION.INVALID) {
    throw new Error(`Input must be an IP V4 or IP V6, got ${trimmedIP}`);
  }

  // Input must be a single IP Address
  if (trimmedIP.includes('/')) {
    throw new Error(`Input must be a single IP address without CIDR, got: "${trimmedIP}"`);
  }

  const isV4 = ipVersion === IP_VERSION.V4;
  const targetNum = isV4 ? ipV4ToNumber(trimmedIP) : ipV6ToBigInt(trimmedIP);

  for (let i = 0; i < rules.length; i++) {
    const rawRule = rules[i];
    const rule = rawRule?.trim();
    if (!rule) continue;

    // Skip rules that do not match the input IP Version
    const ruleVersion = getIPVersion(rule);
    if (ruleVersion !== ipVersion) continue;

    try {
      const { minNum, maxNum } = isV4 ? parseIPV4(rule) : parseIPV6(rule);
      if (targetNum >= minNum && targetNum <= maxNum) return true;
    } catch (error) {
      logger.warn(getErrorMessage(error));
    }
  }

  return false;
}
