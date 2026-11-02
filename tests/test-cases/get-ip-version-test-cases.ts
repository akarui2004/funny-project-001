import { IP_VERSION, IPVersionNumber } from 'src/helpers/ip-resolver';

type IPVersionTestCase = [input: string, expected: IPVersionNumber];

export const GET_IP_VERSION_CASES: IPVersionTestCase[] = [
  // IP V4 valid for a single or with a cidr range
  ['192.168.1.1', IP_VERSION.V4], ['192.168.1.0/24', IP_VERSION.V4],
  ['10.0.0.0/0', IP_VERSION.V4], ['10.0.0.0/32', IP_VERSION.V4],

  // IP V6 valid for a single or with a cidr range
  ['::1', IP_VERSION.V6], ['2001:db8::/32', IP_VERSION.V6], ['2001:db8::/128', IP_VERSION.V6],

  // INVALID: cidr is out of range
  ['10.0.0.0/33', IP_VERSION.INVALID], ['10.0.0.0/024', IP_VERSION.INVALID],
  ['2001:db8::/129', IP_VERSION.INVALID],

  // INVALID: 2 or more slash in an IP string
  ['1.2.3.4/24/8', IP_VERSION.INVALID],

  // INVALID: not an IP even it is a string
  ['not-an-ip', IP_VERSION.INVALID], ['', IP_VERSION.INVALID],
] as const;
