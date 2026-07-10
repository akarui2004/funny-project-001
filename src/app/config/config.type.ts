import { z } from 'zod';
import { DATASOURCE_SCHEMA, ENV_SCHEMA, LOGGING_SCHEMA, REDIS_SCHEMA } from './schema';

export const ROOT_CONFIG_SCHEMA = z.object({
  env: ENV_SCHEMA,
  datasource: DATASOURCE_SCHEMA,
  redis: REDIS_SCHEMA,
  logging: LOGGING_SCHEMA,
});

export type BaseConfigSchema = z.infer<typeof ROOT_CONFIG_SCHEMA>;

export interface AppConfig extends BaseConfigSchema {
  __configure: (configFolder: string) => void,
  __configFolder: string,
}