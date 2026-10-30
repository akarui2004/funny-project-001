import { z } from 'zod';
import { AUTH_SCHEMA, DATASOURCE_MASTER_SCHEMA, DATASOURCE_SCHEMA, ENV_SCHEMA, HTTP_SCHEMA, REDIS_SCHEMA } from './schema';

export const CONFIG_SCHEMA = z.object({
  env: ENV_SCHEMA,
  http: HTTP_SCHEMA,
  auth: AUTH_SCHEMA,
  datasource: DATASOURCE_SCHEMA,
  redis: REDIS_SCHEMA,
});

export type TConfigSchema = z.infer<typeof CONFIG_SCHEMA>;
export type TRedisSchema = z.infer<typeof REDIS_SCHEMA>;
export type TDatasourceSchema = z.infer<typeof DATASOURCE_SCHEMA>;
export type TMasterDatasourceSchema = z.infer<typeof DATASOURCE_MASTER_SCHEMA>;
export type TAuthSchema = z.infer<typeof AUTH_SCHEMA>;
export type THttpSchema = z.infer<typeof HTTP_SCHEMA>;
export type TEnvSchema = z.infer<typeof ENV_SCHEMA>;
