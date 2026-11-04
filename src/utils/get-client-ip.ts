import type { Request } from 'express';
import { getIPVersion, getMappedIPv4, IP_VERSION, ipv6ToBigInt, numberToIPv4 } from 'src/helpers/ip-helper';

export interface ClientIpInfo {
  /** Resolved client IP, the only value to use for allow/deny decisions. Null when unknown or invalid. */
  ip: string | null;
  /** Peer that opened the TCP connection (the client, or the nearest proxy). Not spoofable. */
  socketIp: string | null;
  /** Forwarded hops, client first, as resolved by Express; empty unless `trust proxy` is set. */
  forwardedChain: string[];
}

/**
 * Validate an address and canonicalize it: IPv4-mapped IPv6 (::ffff:a.b.c.d)
 * becomes plain IPv4, so logs, rate-limit keys and rules see one form.
 */
const normalizeIP = (raw: string | undefined): string | null => {
  const value = raw?.trim();
  if (!value) return null;

  const version = getIPVersion(value);
  if (version === IP_VERSION.INVALID || value.includes('/')) return null;
  if (version === IP_VERSION.V4) return value;

  const mapped = getMappedIPv4(ipv6ToBigInt(value));
  return mapped === null ? value : numberToIPv4(mapped);
};

/**
 * Collect the client address information of a request.
 *
 * Forwarding headers (X-Forwarded-For, Forwarded, X-Real-IP, CF-Connecting-IP,
 * True-Client-IP) are plain text any client can send, so they are never read
 * here directly. Express resolves them into `req.ip` / `req.ips` only for
 * hops allowed by the `trust proxy` setting (`app.set('trust proxy', ...)`);
 * set it to the exact proxy hop count or CIDRs, never `true` on a public
 * server. Without it, `req.ip` is the socket peer and the chain is empty.
 * Vendor headers such as CF-Connecting-IP are only meaningful when the proxy
 * overwrites them; configure that proxy to set X-Forwarded-For instead.
 */
export const getClientIp = (req: Request): ClientIpInfo => ({
  ip: normalizeIP(req.ip),
  socketIp: normalizeIP(req.socket?.remoteAddress),
  forwardedChain: (req.ips ?? []).flatMap((hop) => normalizeIP(hop) ?? []),
});
