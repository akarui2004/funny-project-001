export interface SplitCidrResult {
  ip: string;
  maskBits: number;
  isCidr: boolean;
}

/**
 * Split "ip/prefix" into its parts. Input must already be validated by
 * `getIPVersion`; without a prefix the mask defaults to `fullMaskBits`
 * (32 for IPv4, 128 for IPv6), i.e. a single host.
 */
export const splitCidr = (input: string, fullMaskBits: number): SplitCidrResult => {
  const slashIndex = input.indexOf('/');
  if (slashIndex === -1) return { ip: input, maskBits: fullMaskBits, isCidr: false };

  return {
    ip: input.slice(0, slashIndex),
    maskBits: Number(input.slice(slashIndex + 1)),
    isCidr: true,
  };
};
