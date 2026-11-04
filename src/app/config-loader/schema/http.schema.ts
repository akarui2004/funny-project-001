import { getIPVersion, IP_VERSION } from 'src/helpers/ip-helper';
import { z } from 'zod';

// Names Express accepts in `trust proxy` besides IPs / CIDRs
const TRUST_PROXY_KEYWORDS = ['loopback', 'linklocal', 'uniquelocal'];

const TRUST_PROXY_ENTRY = z.string().refine(
  (value) => TRUST_PROXY_KEYWORDS.includes(value) || getIPVersion(value) !== IP_VERSION.INVALID,
  { message: `Must be an IP, a CIDR or one of: ${TRUST_PROXY_KEYWORDS.join(', ')}` },
);

/**
 * Express `trust proxy`: false (no proxy), a hop count, or the proxies' own
 * IPs / CIDRs / keywords. `true` trusts every hop, so a client can pick its own
 * IP; the server warns at startup when it is used.
 */
export const HTTP_TRUST_PROXY_SCHEMA = z.union([
  z.boolean(),
  z.number().int().nonnegative(),
  TRUST_PROXY_ENTRY,
  z.array(TRUST_PROXY_ENTRY).min(1),
]);

export const HTTP_CORS_SCHEMA = z.object({
  origins: z.array(z.string().min(1))
})

export const HTTP_RATE_LIMIT_SCHEMA = z.object({
  windowMs: z.number().int().positive().min(30000),
  limit: z.number().int().positive().min(100)
})

export const HTTP_MANAGER_SCHEMA = z.object({
  allowCidrs: z.array(z.string().min(1))
})

// Max JSON request body, in the units body-parser accepts (e.g. '100kb', '1mb')
export const HTTP_JSON_LIMIT_SCHEMA = z.string().regex(/^\d+(\.\d+)?(b|kb|mb)$/i, {
  message: "Must be a size like '100kb' or '1mb'",
});

export const HTTP_SCHEMA = z.object({
  trustProxy: HTTP_TRUST_PROXY_SCHEMA,
  jsonLimit: HTTP_JSON_LIMIT_SCHEMA,
  cors: HTTP_CORS_SCHEMA,
  rateLimit: HTTP_RATE_LIMIT_SCHEMA,
  manager: HTTP_MANAGER_SCHEMA,
});
