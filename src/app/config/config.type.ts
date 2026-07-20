import { z } from 'zod';
import { DATASOURCE_SCHEMA, ENV_SCHEMA, LOGGER_SCHEMA, REDIS_SCHEMA } from './schema';

export const CONFIG_SCHEMA = z.object({
  env: ENV_SCHEMA,
  datasource: DATASOURCE_SCHEMA,
  redis: REDIS_SCHEMA,
  logger: LOGGER_SCHEMA,
});

export type TConfigSchema = z.infer<typeof CONFIG_SCHEMA>;

export interface AppConfig extends TConfigSchema {
  __configure: (configFolder: string) => void,
  __configFolder: string,
}