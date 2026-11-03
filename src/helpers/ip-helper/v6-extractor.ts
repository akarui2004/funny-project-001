import { getIPVersion, IP_VERSION } from 'src/helpers/ip-helper';
import { IPV6AddressInfo } from 'src/types';

export function parseIPV6(input: string): IPV6AddressInfo {
  const trimmedInput = input.trim();
  if (getIPVersion(trimmedInput) !== IP_VERSION.V6) {
    throw new Error(`Input must be an IP Version 6, got ${trimmedInput}`);
  }

  const slashIndex = trimmedInput.indexOf('/');
  const hasCidr = slashIndex !== -1;
  let ipStr = trimmedInput;
  let maskBits = 128;

  if (hasCidr) {
    ipStr = trimmedInput.slice(0, slashIndex);
    maskBits = parseInt(trimmedInput.slice(slashIndex + 1), 10);
  }

  const ipNum = ipV6ToBigInt(ipStr);

  // Compute 128-bit mask
  const mask = ((1n << BigInt(maskBits)) - 1n) << BigInt(128 - maskBits);

  // Calculate min/max addresses and address capacity
  const minNum = ipNum & mask;
  const maxNum = minNum | ((1n << BigInt(128 - maskBits)) - 1n);
  const totalIPs = 1n << BigInt(128 - maskBits);

  return {
    input: trimmedInput,
    ip: ipStr,
    cidr: `${ipStr}/${maskBits}`,
    maskBits,
    isCidr: hasCidr,
    minNum,
    maxNum,
    minIP: bigIntToIPV6(minNum),
    maxIP: bigIntToIPV6(maxNum),
    totalIPs,
  };
}

export function ipV6ToBigInt(ip: string): bigint {
  const doubleColonIdx = ip.indexOf('::');
  const hasDoubleColon = doubleColonIdx !== -1;

  // Pre-count hextets located to the right of '::'
  let rightWords = 0;
  if (hasDoubleColon && doubleColonIdx + 2 < ip.length) {
    rightWords = 1;
    for (let i = doubleColonIdx + 2; i < ip.length; i++) {
      if (ip.charCodeAt(i) === 58 /* ':' */) rightWords++;
    }
  }

  const leftEnd = hasDoubleColon ? doubleColonIdx : ip.length;
  let result = 0n;
  let leftWords = 0;
  let val = 0;
  let hasDigit = false;

  // Parse left-hand side hextets
  for (let i = 0; i < leftEnd; i++) {
    const code = ip.charCodeAt(i);
    if (code === 58 /* ':' */) {
      if (hasDigit) {
        result = (result << 16n) | BigInt(val);
        leftWords++;
        val = 0;
        hasDigit = false;
      }
    } else {
      const d = code <= 57 ? code - 48 : (code <= 70 ? code - 55 : code - 87);
      val = (val << 4) | d;
      hasDigit = true;
    }
  }
  if (hasDigit) {
    result = (result << 16n) | BigInt(val);
    leftWords++;
    val = 0;
    hasDigit = false;
  }

  // Account for omitted zero hextets, then parse right-hand side
  if (hasDoubleColon) {
    const missingZeros = 8 - (leftWords + rightWords);
    result <<= BigInt(missingZeros * 16);

    for (let i = doubleColonIdx + 2; i < ip.length; i++) {
      const code = ip.charCodeAt(i);
      if (code === 58 /* ':' */) {
        if (hasDigit) {
          result = (result << 16n) | BigInt(val);
          val = 0;
          hasDigit = false;
        }
      } else {
        const d = code <= 57 ? code - 48 : (code <= 70 ? code - 55 : code - 87);
        val = (val << 4) | d;
        hasDigit = true;
      }
    }
    if (hasDigit) {
      result = (result << 16n) | BigInt(val);
    }
  }

  return result;
}

export function bigIntToIPV6(num: bigint): string {
  const words = new Uint16Array(8);
  let temp = num;
  for (let i = 7; i >= 0; i--) {
    words[i] = Number(temp & 0xffffn);
    temp >>= 16n;
  }

  // Tìm dải số 0 liên tiếp dài nhất để nén thành '::' (chuẩn RFC 5952)
  let bestStart = -1;
  let bestLen = 0;
  let curStart = -1;
  let curLen = 0;

  for (let i = 0; i < 8; i++) {
    const word = words[i] ?? 0;
    if (word === 0) {
      if (curStart === -1) {
        curStart = i;
        curLen = 1;
      } else {
        curLen++;
      }
      if (curLen > bestLen) {
        bestStart = curStart;
        bestLen = curLen;
      }
    } else {
      curStart = -1;
      curLen = 0;
    }
  }

  if (bestLen < 2) {
    let res = '';
    for (let i = 0; i < 8; i++) {
      const hex = (words[i] ?? 0).toString(16);
      res += (i === 0 ? '' : ':') + hex;
    }
    return res;
  }

  let left = '';
  for (let i = 0; i < bestStart; i++) {
    const hex = (words[i] ?? 0).toString(16);
    left += (i === 0 ? '' : ':') + hex;
  }

  let right = '';
  for (let i = bestStart + bestLen; i < 8; i++) {
    const hex = (words[i] ?? 0).toString(16);
    right += (right === '' ? '' : ':') + hex;
  }

  return `${left}::${right}`;
}
