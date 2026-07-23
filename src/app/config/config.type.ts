import { z } from 'zod';
import { DATASOURCE_MASTER, DATASOURCE_SCHEMA, ENV_SCHEMA, REDIS_SCHEMA } from './schema';

export const CONFIG_SCHEMA = z.object({
  env: ENV_SCHEMA,
  datasource: DATASOURCE_SCHEMA,
  redis: REDIS_SCHEMA,
});

export type TConfigSchema = z.infer<typeof CONFIG_SCHEMA>;
export type TRedisSchema = z.infer<typeof REDIS_SCHEMA>;
export type TDatasourceSchema = z.infer<typeof DATASOURCE_SCHEMA>;
export type TMasterDatasourceSchema = z.infer<typeof DATASOURCE_MASTER>;
export type TEnvSchema = z.infer<typeof ENV_SCHEMA>;
