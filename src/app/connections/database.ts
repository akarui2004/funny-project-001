import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import appConfig from 'src/app/config-loader';
import { getErrorMessage } from 'src/utils/get-error-message';
import { createModuleLogger } from 'src/utils/logger';
import { TDatasourceSchema } from '../config-loader/config.type';
import { buildPgPoolConfig } from './build-pg-pool-config';

const log = createModuleLogger('db');

class DatabaseManager {
  private dbConfig: TDatasourceSchema;
  // Untyped internally; callers pick the table types they may see through getDb<DB>()
  private dbClients: Partial<Record<keyof TDatasourceSchema, Kysely<any>>> = {};

  public constructor() {
    this.dbConfig = appConfig.datasource;
  }

  public async initialize(connType: keyof TDatasourceSchema = 'master') {
    // Early return if the db already existing
    if (this.dbClients[connType]) {
      return;
    }

    const db = new Kysely<any>({
      dialect: new PostgresDialect({ pool: new Pool(buildPgPoolConfig(this.dbConfig[connType])) }),
      // SQL goes through winston (visible with LOG_LEVEL=debug). Parameters are never logged: they carry passwords and secrets
      log: (event) => {
        if (event.level === 'query') {
          log.debug(`${event.query.sql} (${event.queryDurationMillis.toFixed(1)}ms)`);
        } else {
          log.error(`${event.query.sql} failed: ${getErrorMessage(event.error)}`);
        }
      },
    });

    try {
      // pg Pool connects lazily, so a round-trip is the only way to prove the connection works at boot
      await sql`select 1`.execute(db);
    } catch (error) {
      log.error(`❌ [${connType}] Unable to connect: ${getErrorMessage(error)}`);
      // Do not leave a half-open pool behind; rethrow so the boot process knows the DB failed
      await db.destroy();
      throw error;
    }

    this.dbClients[connType] = db;
    log.info(`✅ [${connType}] Connection established`);
  }

  /**
   * Disconnects a specific database connection by connection type.
   */
  public async disconnect(connType: keyof TDatasourceSchema): Promise<void> {
    const client = this.dbClients[connType];
    if (!client) {
      return;
    }

    try {
      await client.destroy();
      delete this.dbClients[connType];
      log.info(`🔌 [${connType}] Connection closed`);
    } catch (error) {
      log.error(`❌ [${connType}] Error disconnecting: ${getErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Disconnects all active database connections (useful during app shutdown).
   */
  public async disconnectAll(): Promise<void> {
    const activeConnTypes = Object.keys(this.dbClients) as (keyof TDatasourceSchema)[];

    for (const connType of activeConnTypes) {
      await this.disconnect(connType);
    }
  }

  /**
   * Same contract as appRedis.getClient(): throw instead of returning null, so callers never null-check.
   * No default for DB on purpose: each caller states the tables it may touch (a module passes only its own).
   */
  public getDb<DB>(connType: keyof TDatasourceSchema = 'master'): Kysely<DB> {
    const client = this.dbClients[connType];
    if (!client) {
      throw new Error(`[DB] Connection '${String(connType)}' is not initialized. Call appDb.initialize() first.`);
    }

    return client as Kysely<DB>;
  }
}

export const appDb = new DatabaseManager();
