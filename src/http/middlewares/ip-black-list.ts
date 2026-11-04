/**
 * Public-facing app
 * Block known spam, brute-force and abusive IPs
 * Combine with rate-limit to auto-ban
 *
 * Supported rules: single IPv4/IPv6 and IPv4/IPv6 CIDR. An IPv4-mapped IPv6
 * client (::ffff:a.b.c.d) is also checked against the IPv4 rules.
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { matchIPRules } from 'src/helpers';
import { createModuleLogger } from 'src/utils';
import { getClientIp } from 'src/utils/get-client-ip';
import { HTTP_ERRORS, HttpError } from '../errors/http-error';

const logger = createModuleLogger('http');

/**
 * Reject with 403 any client whose IP matches `blockedRules` (IPs or CIDRs).
 * An empty list blocks nobody.
 *
 * The client IP comes from `getClientIp`; behind a proxy `trust proxy` must be
 * configured, otherwise every request looks like it comes from the proxy.
 */
export const ipBlacklist = (blockedRules: string[]): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { ip } = getClientIp(req);
    if (blockedRules.length > 0 && ip !== null && matchIPRules(ip, blockedRules)) {
      logger.warn(`Blocked request from blacklisted IP ${ip}`);
      next(HttpError.forbidden(undefined, { code: HTTP_ERRORS.forbidden.code }));
      return;
    }
    next();
  };
};
