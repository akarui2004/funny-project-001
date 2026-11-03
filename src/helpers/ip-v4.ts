import { getIPVersion, IP_VERSION } from 'src/helpers/ip-resolver';
import { IPV4AddressInfo } from 'src/types';

export function parseIPV4(input: string): IPV4AddressInfo {
  const trimmedInput = input.trim();
  if (getIPVersion(trimmedInput) !== IP_VERSION.V4) {
    throw new Error(`Input must be an IP Version 4, got ${trimmedInput}`);
  }

  const slashIndex = trimmedInput.indexOf('/');
  const hasCidr = slashIndex !== -1;
  let ipStr = trimmedInput;
  let maskBits = 32;

  if (hasCidr) {
    ipStr = trimmedInput.slice(0, slashIndex);
    maskBits = parseInt(trimmedInput.slice(slashIndex + 1), 10);
  }

  const ipNum = ipV4ToNumber(ipStr);
  const mask = maskBits === 0 ? 0 : (~0 << (32 - maskBits)) >>> 0;

  // calculate min/max
  const minNum = (ipNum & mask) >>> 0;
  const maxNum = (minNum | ~mask) >>> 0;
  const totalIPs = 2 ** (32 - maskBits);

  return {
    input: trimmedInput,
    ip: ipStr,
    cidr: `${ipStr}/${maskBits}`,
    maskBits,
    isCidr: hasCidr,
    minNum,
    maxNum,
    minIP: numberToIPV4(minNum),
    maxIP: numberToIPV4(maxNum),
    totalIPs,
  };
}

export function ipV4ToNumber(ip: string): number {
  let num = 0;
  let octet = 0;

  for (let i = 0; i < ip.length; i++) {
    const dotCode = ip.charCodeAt(i);
    if (dotCode === 46) {
      // the symbol '.'
      num = ((num << 8) | octet) >>> 0;
      octet = 0;
    } else {
      // convert char code '0' to '9' to number directly without parseInt
      octet = octet * 10 + (dotCode - 48);
    }
  }

  return ((num << 8) | octet) >>> 0;
}

export function numberToIPV4(num: number): string {
  return `${num >>> 24}.${(num >>> 16) & 255}.${(num >>> 8) & 255}.${num & 255}`;
}
