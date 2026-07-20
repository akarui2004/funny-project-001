import { z } from 'zod';

const LOGGING_ROTATION = z.object({
  dirname: z.string().default('logs'),
  prefixFileName: z.string(),
  datePattern: z.string().default('YYYY-MM-DD'),
  maxSize: z.string().default('10m'),
  maxFiles: z.string().default('30d'),
});

export const LOGGING_SCHEMA = z.object({
  level: z.enum(['emerg', 'alert', 'crit', 'error', 'warning', 'notice', 'info', 'debug']).default('info'),
  rotation: LOGGING_ROTATION,
});
