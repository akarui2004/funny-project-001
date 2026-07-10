import { z } from 'zod';

const ROTATING_FILE_LIMIT = z.object({
  count: z.coerce.number().default(30)
});

const ROTATING_FILE_OPTION = z.object({
  frequency: z.string().default('daily'),
  size: z.string().default('100m'),
  limit: ROTATING_FILE_LIMIT,
});

export const LOGGING_SCHEMA = z.object({
  path: z.string().default('logs'),
  baseFileName: z.string().default('app'),
  level: z.string().default('info'),
  rotatingFile: ROTATING_FILE_OPTION,
});