import { z } from 'zod';

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

export const HTTP_SCHEMA = z.object({
  trustProxy: z.boolean(),
  cors: HTTP_CORS_SCHEMA,
  rateLimit: HTTP_RATE_LIMIT_SCHEMA,
  manager: HTTP_MANAGER_SCHEMA,
});
