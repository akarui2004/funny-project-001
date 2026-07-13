import { z } from 'zod';

const LOGGER_ROTATING_FILE = z.object({
  dirname: z.string().default('logs'),
  prefixFileName: z.string(),
  datePattern: z.string().default('YYYY-MM-DD'),
  maxSize: z.string().default('10m'),
  maxFiles: z.string().default('30d'),
});

export const LOGGER_SCHEMA = z.object({
  level: z.enum(['emerg', 'alert', 'crit', 'error', 'warning', 'notice', 'info', 'debug']).default('info'),
  rotating: LOGGER_ROTATING_FILE,
});