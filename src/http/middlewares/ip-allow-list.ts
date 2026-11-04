/**
 * Sensitive endpoints: admin, internal API, debug
 * ENV: staging/pre-production restricted to the test team
 * CI/CD webhooks accepted only from GitHub/GitLab IP ranges
 * Protect metrics endpoints (Prometheus, health check)
 * Compliance with zero-trust requirements (PCI-DSS, HIPAA)
 * Note:
 *  ‣ PCI-DSS: Payment Card Industry Security Standards Council
 *  ‣ HIPAA: Health Insurance Portability and Accountability Act
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { matchIPRules } from 'src/helpers';
import { getClientIp } from 'src/utils/get-client-ip';
import { HTTP_ERRORS, HttpError } from '../errors/http-error';

/**
 * Only let clients whose IP matches `allowedRules` (IPs or CIDRs) through.
 * An empty list means unrestricted access. Anything else is denied with 403,
 * including a request whose IP cannot be determined.
 *
 * The client IP comes from `getClientIp`, which never reads raw forwarding
 * headers; behind a proxy `trust proxy` must be configured.
 */
export const ipAllowlist = (allowedRules: string[]): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { ip } = getClientIp(req);
    if (allowedRules.length === 0 || (ip !== null && matchIPRules(ip, allowedRules))) {
      next();
      return;
    }
    next(HttpError.forbidden(undefined, { code: HTTP_ERRORS.forbidden.code }));
  };
};
