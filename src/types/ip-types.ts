export interface BaseIPAddressInfo<TNum extends number | bigint = number> {
  input: string;
  ip: string;
  cidr: string;
  maskBits: number;
  isCidr: boolean;

  // ip to number with min, max num
  minNum: TNum;
  maxNum: TNum;

  // ip string to display
  minIP: string;
  maxIP: string;

  // total IPs
  totalIPs: TNum;
}

export interface IPv4AddressInfo extends BaseIPAddressInfo<number> { }
export interface IPv6AddressInfo extends BaseIPAddressInfo<bigint> { }

export type IPAddressInfo = IPv4AddressInfo | IPv6AddressInfo;
