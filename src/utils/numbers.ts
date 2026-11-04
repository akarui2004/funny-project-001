import { UnsignedBigInteger, UnsignedInteger } from 'src/types';

export function toUInt(value: number): UnsignedInteger {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Value must be a non-negative integer, got ${value}`);
  }

  return value as UnsignedInteger;
}

export function toUBigInt(value: number): UnsignedBigInteger {
  const bigVal = BigInt(value);
  if (bigVal < 0n) {
    throw new Error(`Value must be a non-negative integer, got ${value}`);
  }

  return bigVal as UnsignedBigInteger;
}
