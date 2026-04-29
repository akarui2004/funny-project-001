export const Defaults = {
  // The default port the server listens on
  LISTEN_PORT: 3000,

  // The folder where the configuration files are located
  CONFIG_FOLDER: "./config",

  // The default host
  DEFAULT_HOST: "localhost",

  // The default schema for the datasource
  DATASOURCE_PG_SCHEMA: "public",
  DATASOURCE_PG_PORT: 5432,
  DATASOURCE_PG_DIALECT: "postgres",

  // The default host and port for Redis
  REDIS_PORT: 6379,
  REDIS_DB: 0,

  // The default TTL for cache entries in seconds (e.g., 24 hours)
  DEFAULT_TTL: 86400, // 24 hours in seconds
} as const;
