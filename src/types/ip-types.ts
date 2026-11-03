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

export interface IPV4AddressInfo extends BaseIPAddressInfo<number> { }
export interface IPV6AddressInfo extends BaseIPAddressInfo<bigint> { }

export type IPAddressInfo = IPV4AddressInfo | IPV6AddressInfo;
