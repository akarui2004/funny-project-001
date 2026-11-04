type TestCase = [input: string, rules: string[], expected: boolean];

export const MATCH_IP_TEST_CASES: TestCase[] = [
  // ===========================================================================
  // 1. IPv4 - Exact Match
  // ===========================================================================
  // Exact match for a single IPv4 address
  ['192.168.1.1', ['192.168.1.1'], true],

  // Mismatch due to a different host address
  ['192.168.1.2', ['192.168.1.1'], false],

  // Match when the target IP is located among multiple rules
  ['172.16.0.5', ['10.0.0.1', '172.16.0.5', '192.168.1.1'], true],


  // ===========================================================================
  // 2. IPv4 - CIDR Subnet & Boundary Values
  // ===========================================================================
  // Match IP located inside the /24 subnet range
  ['192.168.1.50', ['192.168.1.0/24'], true],

  // Match lower boundary: Network Address (.0)
  ['192.168.1.0', ['192.168.1.0/24'], true],

  // Match upper boundary: Broadcast Address (.255)
  ['192.168.1.255', ['192.168.1.0/24'], true],

  // Out of range: immediately below the lower boundary (.0.255)
  ['192.168.0.255', ['192.168.1.0/24'], false],

  // Out of range: immediately above the upper boundary (.2.0)
  ['192.168.2.0', ['192.168.1.0/24'], false],

  // Match /32 prefix (exact single host)
  ['10.0.0.1', ['10.0.0.1/32'], true],

  // Mismatch /32 prefix with a different IP
  ['10.0.0.2', ['10.0.0.1/32'], false],

  // Match /0 prefix (wildcard for all IPv4 addresses)
  ['203.0.113.195', ['0.0.0.0/0'], true],


  // ===========================================================================
  // 3. IPv6 - Exact Match & Formatting Normalization
  // ===========================================================================
  // Exact match with identical string representation
  ['2001:db8::1', ['2001:db8::1'], true],

  // Match compressed (::) input against fully expanded IPv6 rule
  ['2001:db8::1', ['2001:0db8:0000:0000:0000:0000:0000:0001'], true],

  // Match compressed loopback (::1) against expanded (0:0:0:0:0:0:0:1)
  ['::1', ['0:0:0:0:0:0:0:1'], true],

  // Mismatch for a different IPv6 address
  ['2001:db8::2', ['2001:db8::1'], false],


  // ===========================================================================
  // 4. IPv6 - CIDR Subnet & Boundary Values
  // ===========================================================================
  // Match IP located inside the /32 IPv6 subnet range
  ['2001:db8:ffff::1', ['2001:db8::/32'], true],

  // Match lowest boundary of /32 subnet
  ['2001:db8::', ['2001:db8::/32'], true],

  // Match highest boundary of /32 subnet (ffff...ffff)
  ['2001:db8:ffff:ffff:ffff:ffff:ffff:ffff', ['2001:db8::/32'], true],

  // Out of range: immediately above the upper boundary (db9::)
  ['2001:db9::', ['2001:db8::/32'], false],

  // Match /128 prefix (exact single IPv6 host)
  ['::1', ['::1/128'], true],

  // Match ::/0 prefix (wildcard for all IPv6 addresses)
  ['fe80::1ff:fe23:4567', ['::/0'], true],


  // ===========================================================================
  // 5. Cross-version & Mixed Rules
  // ===========================================================================
  // IPv4 does not match IPv6 rule even with wildcard prefix (::/0)
  ['192.168.1.1', ['::/0'], false],

  // IPv6 does not match IPv4 rule even with wildcard prefix (0.0.0.0/0)
  ['2001:db8::1', ['0.0.0.0/0'], false],

  // Match IPv4 rule in mixed IPv4/IPv6 ruleset
  ['10.20.30.40', ['2001:db8::/32', '10.0.0.0/8', 'fe80::/64'], true],

  // Match IPv6 rule in mixed IPv4/IPv6 ruleset
  ['fe80::abcd', ['192.168.0.0/16', '10.0.0.0/8', 'fe80::/64'], true],


  // ===========================================================================
  // 6. Edge Cases & Defensive Validation
  // ===========================================================================
  // Empty rules array never matches (allow-all policy lives in the allow-list middleware)
  ['192.168.1.1', [], false],

  // Empty input string -> false
  ['', ['192.168.1.1'], false],

  // Invalid IP format -> false
  ['999.999.999.999', ['0.0.0.0/0'], false],

  // Input contains CIDR (only discrete host IP is accepted as input) -> false
  ['192.168.1.1/24', ['192.168.1.0/24'], false],

  // Malformed rule is ignored, matches subsequent valid rule
  ['192.168.1.10', ['invalid-ip-format', '256.0.0.1/32', '192.168.1.0/24'], true],

  // IPv4-mapped IPv6 input is matched against the IPv4 rules of the embedded address
  ['::ffff:10.0.0.5', ['10.0.0.0/8'], true],
  ['::ffff:11.0.0.5', ['10.0.0.0/8'], false],

  // IPv4-mapped IPv6 input still matches a plain IPv6 rule
  ['::ffff:10.0.0.5', ['::ffff:0:0/96'], true],

  // IPv6 zone id is not a valid input
  ['fe80::1%eth0', ['fe80::/10'], false],
];
