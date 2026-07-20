import { z } from 'zod';
import { DATASOURCE_SCHEMA, ENV_SCHEMA, REDIS_SCHEMA } from './schema';

export const CONFIG_SCHEMA = z.object({
  env: ENV_SCHEMA,
  datasource: DATASOURCE_SCHEMA,
  redis: REDIS_SCHEMA,
});

export type TConfigSchema = z.infer<typeof CONFIG_SCHEMA>;
