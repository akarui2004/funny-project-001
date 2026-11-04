export type UnsignedInteger = number & { readonly __brand: unique symbol; };

export type UnsignedBigInteger = bigint & { readonly __brand: unique symbol; };
