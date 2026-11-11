import { Router } from 'express';
import { HttpError } from 'src/http/errors/http-error';
import { createModuleLogger, getErrorMessage } from 'src/utils';

const logger = createModuleLogger('health');

export type ReadinessChecks = Record<string, () => Promise<unknown>>;
export const READINESS_TIMEOUT_MS = 2000;

const withTimeout = async (check: () => Promise<unknown>, timeoutMs: number) => {
  let timer: NodeJS.Timeout | undefined;

  try {
    await Promise.race([
      check(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`timed out after ${timeoutMs}`)), timeoutMs);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export function createHealthRouter(checks: ReadinessChecks, timeoutMs = READINESS_TIMEOUT_MS): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  router.get('/ready', async (_req, res, next) => {
    const results = await Promise.all(
      Object.entries(checks).map(async ([name, check]) => {
        try {
          await withTimeout(check, timeoutMs);
          return true;
        } catch (error) {
          logger.warn(`readiness check "${name}" failed: ${getErrorMessage(error)}`);
          return false;
        }
      })
    );

    if (results.some((ok) => !ok)) {
      next(HttpError.serviceUnavailable());
      return;
    }

    res.status(200).json({ status: 'ready' });
  });

  return router;
}
