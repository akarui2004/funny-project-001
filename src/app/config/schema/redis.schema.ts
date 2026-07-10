import { z } from 'zod';

const REDIS_OPTION = z.object({
  connectionTimeout: z.coerce.number().default(60000),
  keepAlive: z.coerce.number().default(30000),
  maxRetriesPerRequest: z.coerce.number().default(5),
});

const REDIS_CONNECTION = z.object({
  host: z.string().default('localhost'),
  port: z.coerce.number().default(6379),
  keyPrefix: z.string().regex(/^[a-zA-Z0-9]+:$/, {
    message: "keyPrefix must end with a colon (e.g., 'app:')",
  }),
  db: z.coerce.number().default(0),
  option: REDIS_OPTION,
})

export const REDIS_SCHEMA = z.object({
  master: REDIS_CONNECTION,
  queue: REDIS_CONNECTION,
});