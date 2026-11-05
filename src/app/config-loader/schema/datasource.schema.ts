import { z } from 'zod';

// pg has a single "get a client" timeout, configured by pool.acquireTimeout; a separate connect timeout no longer exists
const DATASOURCE_MASTER_OPTIONS_SCHEMA = z.object({
  ssl: z.boolean(),
});

const DATASOURCE_MASTER_POOL_SCHEMA = z.object({
  max: z.coerce.number().default(10),
  min: z.coerce.number().default(5),
  acquireTimeout: z.coerce.number().default(30000),
  idle: z.coerce.number().default(10000)
});

export const DATASOURCE_MASTER_SCHEMA = z.object({
  // Only PostgreSQL is supported (Kysely PostgresDialect over pg)
  dialect: z.literal('postgres').default('postgres'),
  host: z.string().default('localhost'),
  port: z.coerce.number().default(5432),
  // Becomes `-c search_path=<schema>` in the pg startup packet, so allow plain identifiers only
  schema: z.string().regex(/^[a-z_][a-z0-9_]*$/, 'schema must be a lowercase identifier').optional().default('public'),
  database: z.string().default('fund_project'),
  username: z.string().min(1, 'username is required (set it in <env>.toml or <env>.local.toml)'),
  password: z.string().min(1, 'password is required (set it in <env>.toml or <env>.local.toml)'),
  pool: DATASOURCE_MASTER_POOL_SCHEMA,
  option: DATASOURCE_MASTER_OPTIONS_SCHEMA
});

export const DATASOURCE_SCHEMA = z.object({
  master: DATASOURCE_MASTER_SCHEMA,
});
