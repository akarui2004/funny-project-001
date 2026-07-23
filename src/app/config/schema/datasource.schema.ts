import { z } from 'zod';

const DATASOURCE_MASTER_OPTIONS = z.object({
  ssl: z.boolean(),
  connectionTimeout: z.coerce.number().default(60000)
});

const DATASOURCE_MASTER_POOL = z.object({
  max: z.coerce.number().default(10),
  min: z.coerce.number().default(5),
  acquireTimeout: z.coerce.number().default(30000),
  idle: z.coerce.number().default(10000)
});

export const DATASOURCE_MASTER = z.object({
  dialect: z.string().default('postgres'),
  host: z.string().default('localhost'),
  port: z.coerce.number().default(5432),
  schema: z.string().optional().default('public'),
  database: z.string().default('fund_project'),
  username: z.string(),
  password: z.string(),
  pool: DATASOURCE_MASTER_POOL,
  option: DATASOURCE_MASTER_OPTIONS
});

export const DATASOURCE_SCHEMA = z.object({
  master: DATASOURCE_MASTER,
});
