import { z } from 'zod';

export const AUTH_ACCESS_TTL_SCHEMA = z.object({
  api: z.number().int().positive().min(900),
  ops: z.number().int().positive().min(900),
  manager: z.number().int().positive().min(900)
})

export const AUTH_REFRESH_TTL_SCHEMA = z.object({
  api: z.number().int().positive().min(3600),
  ops: z.number().int().positive().min(3600),
  manager: z.number().int().positive().min(3600)
})

export const AUTH_SCHEMA = z.object({
  issuer: z.string().nonempty(),
  accessTtlSeconds: AUTH_ACCESS_TTL_SCHEMA,
  refreshTtlSeconds: AUTH_REFRESH_TTL_SCHEMA,
})
