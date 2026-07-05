import z from 'zod';

const AppSchema = z.object({
  listenPort: z.coerce.number().default(3000),
});

const PostgresOptionsSchema = z.object({
  ssl: z.boolean().default(false),
  connectTimeout: z.coerce.number().default(60000),
});

const PostgresPoolSchema = z.object({
  max: z.coerce.number().default(10),
  min: z.coerce.number().default(1),
  acquire: z.coerce.number().default(30000),
  idle: z.coerce.number().default(10000),
});

const PostgresSchema = z.object({
  dialect: z.string().default('postgres'),
  host: z.string().default('localhost'),
  port: z.coerce.number().default(5432),
  schema: z.string().default('public'),
  database: z.string().default('funny_project'),
  username: z.string(),
  password: z.string(),
  pool: PostgresPoolSchema,
  options: PostgresOptionsSchema,
})

const RedisOptionSchema = z.object({
  connectTimeout: z.coerce.number().default(5000),
  maxRetriesPerRequest: z.coerce.number().default(3),
  keepAlive: z.coerce.number().optional(),
  enableReadyCheck: z.boolean().optional(),
})

const RedisDbSchema = z.object({
  host: z.string().default('localhost'),
  port: z.coerce.number().default(6379),
  db: z.coerce.number().default(0),
  keyPrefix: z.string().default('fp-api:'),
  options: RedisOptionSchema,
});

const RedisSchema = z.object({
  main: RedisDbSchema,
  queue: RedisDbSchema,
})

const LoggingRotateSchema = z.object({
  frequency: z.string().default('daily'), // rotate every 1 day
  mkdir: z.boolean().default(true), // create directory if not exists
  size: z.string().default('100m'), // rotate when file size exceeds 20MB
  limit: z.object({
    count: z.coerce.number().default(30), // keep last 30 files
    removeOtherLogFile: z.boolean().default(true), // When true, will remove files not created by the current process.
  }),
});

const LoggingSchema = z.object({
  path: z.string().default('logs'),
  baseFileName: z.string().default('app'),
  level: z.string().default('info'),
  rotate: LoggingRotateSchema,
});

const ConfigSchema = z.object({
  app: AppSchema,
  datasource: PostgresSchema,
  redis: RedisSchema,
  logging: LoggingSchema,
});

export type TConfig = z.infer<typeof ConfigSchema>;
export type TAppConfig = z.infer<typeof AppSchema>;
export type TPostgresConfig = z.infer<typeof PostgresSchema>;
export type TRedisConfig = z.infer<typeof RedisSchema>;
export type TLoggingConfig = z.infer<typeof LoggingSchema>;

export {
  ConfigSchema,
  AppSchema,
  PostgresSchema,
  RedisSchema,
  LoggingSchema,
}
