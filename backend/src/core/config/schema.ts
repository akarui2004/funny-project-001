import { Defaults } from "src/constants";
import z from "zod";

export const EnvConfigSchema = z.object({
  port: z.coerce.number().default(Defaults.LISTEN_PORT),
});

export const PostgreSQLConfigSchema = z.object({
  name: z.string(),
  username: z.string(),
  password: z.string(),
  schema: z.string().default(Defaults.DATASOURCE_PG_SCHEMA),
  options: z.object({
    host: z.string().or(z.ipv4()).default(Defaults.DEFAULT_HOST),
    port: z.coerce.number().default(Defaults.DATASOURCE_PG_PORT),
    timezone: z.string(),
    dialect: z.literal(Defaults.DATASOURCE_PG_DIALECT),
    maxConnections: z.coerce.number(),
  }),
});

export const RedisConfigSchema = z.object({
  host: z.string().or(z.ipv4()).default(Defaults.DEFAULT_HOST),
  port: z.coerce.number().default(Defaults.REDIS_PORT),
  keyPrefix: z.string(),
  db: z.coerce.number().default(Defaults.REDIS_DB),
});

export const CacheConfigSchema = z.object({
  ttl: z.coerce.number().default(Defaults.DEFAULT_TTL),
});

export const RootConfigSchema = z.object({
  env: EnvConfigSchema,
  datasources: z.object({
    default: PostgreSQLConfigSchema,
  }),
  redis: z.object({
    main: RedisConfigSchema,
  }),
  cache: CacheConfigSchema,
});

export type RootConfig = z.infer<typeof RootConfigSchema>;
export type EnvConfig = z.infer<typeof EnvConfigSchema>;
export type PostgreSQLConfig = z.infer<typeof PostgreSQLConfigSchema>;
export type RedisConfig = z.infer<typeof RedisConfigSchema>;
export type CacheConfig = z.infer<typeof CacheConfigSchema>;
