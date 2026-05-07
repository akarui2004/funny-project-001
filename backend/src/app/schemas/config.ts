import z from 'zod';
import { fr } from 'zod/v4/locales';

const ConfigEnvSchema = z.object({
  listenPort: z.coerce.number().default(3000)
});

const DSPoolSchema = z.object({
  max: z.coerce.number(),
  min: z.coerce.number().default(0),
  acquire: z.coerce.number(),
  idle: z.coerce.number()
});

const DSOptionsSchema = z.object({
  ssl: z.boolean().default(false),
  connectTimeout: z.coerce.number().default(10000)
});

const DSSchema = z.object({
  dialect: z.enum(['mysql', 'postgres', 'sqlite', 'mariadb', 'mssql']),
  host: z.string().or(z.ipv4()),
  port: z.coerce.number(),
  schema: z.string().optional(),
  database: z.string(),
  username: z.string(),
  password: z.string(),
  pool: DSPoolSchema.optional(),
  options: DSOptionsSchema.optional()
});

const ConfigDatasourceSchema = z.object({
  source: z.enum(['default', 'replica']).default('default'),
  default: DSSchema.optional()
});

const RedisOptionSchema = z.object({
  connectTimeout: z.coerce.number().default(5000),
  keepAlive: z.coerce.number().optional(),
  enableReadyCheck: z.boolean().optional(),
  maxRetriesPerRequest: z.coerce.number()
});

const RedisSchema = z.object({
  host: z.string().or(z.ipv4()),
  port: z.coerce.number().default(6379),
  keyPrefix: z.string(),
  db: z.coerce.number().default(0),
  options: RedisOptionSchema.optional()
});

const ConfigRedisSchema = z.object({
  source: z.string().default('main'),
  main: RedisSchema.optional(),
  queue: RedisSchema.optional()
});

const LoggingRotateLimitSchema = z.object({
  count: z.coerce.number().default(30),
  removeOtherLogFile: z.boolean().default(true)
});

const LoggingRotateSchema = z.object({
  frequency: z.enum(['daily', 'hourly', 'weekly', 'monthly']).default('daily'),
  mkdir: z.boolean().default(true),
  size: z.string().optional(),
  limit: LoggingRotateLimitSchema.optional()
});

const ConfigLoggingSchema = z.object({
  path: z.string().default('logs'),
  baseFileName: z.string().default('app'),
  level: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  rotate: LoggingRotateSchema.optional(),
});

const BaseConfigSchema = z.object({
  env: ConfigEnvSchema.optional(),
  datasources: ConfigDatasourceSchema.optional(),
  redis: ConfigRedisSchema.optional(),
  logging: ConfigLoggingSchema.optional()
});

export type BaseConfig = z.infer<typeof BaseConfigSchema>;
export type ConfigEnv = z.infer<typeof ConfigEnvSchema>;
export type ConfigDatasource = z.infer<typeof ConfigDatasourceSchema>;
export type ConfigRedis = z.infer<typeof ConfigRedisSchema>;
export type ConfigLogging = z.infer<typeof ConfigLoggingSchema>;
export type DSSchemaType = z.infer<typeof DSSchema>;

export {
  BaseConfigSchema,
  ConfigEnvSchema,
  ConfigDatasourceSchema,
  ConfigRedisSchema,
  ConfigLoggingSchema
};
