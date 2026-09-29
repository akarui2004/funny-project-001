import { Dialect, Sequelize, Options as SequelizeOptions } from 'sequelize';
import appConfig from 'src/app/config';
import { createModuleLogger } from 'src/utils/logger';
import { TDatasourceSchema, TMasterDatasourceSchema } from '../config/config.type';

const log = createModuleLogger('db');

/**
 * Maps a TOML datasource entry to Sequelize options.
 * Shared by the runtime connection and the Sequelize CLI config (src/config/database.ts),
 * so both connect with the same settings (pool, ssl, timeouts).
 */
export const buildSequelizeOptions = (datasource: TMasterDatasourceSchema): SequelizeOptions => {
  const {
    dialect, host, port,
    schema, database,
    username, password,
    pool: poolOptions, option: otherOptions
  } = datasource;
  const { min, max, idle, acquireTimeout: acquire } = poolOptions;
  const { ssl, connectionTimeout: connectTimeout } = otherOptions;
  return {
    dialect: dialect as Dialect,
    host, port,
    schema, database,
    username, password,
    pool: { min, max, acquire, idle },
    dialectOptions: { ssl, connectTimeout },
  };
};

class Database {
  private dbConfig: TDatasourceSchema;
  private dbClients: Partial<Record<keyof TDatasourceSchema, Sequelize>> = {};

  public constructor() {
    this.dbConfig = appConfig.datasource;
  }

  public async initialize(connType: keyof TDatasourceSchema = 'master') {
    // Early return if the db already existing
    if (this.dbClients[connType]) {
      return;
    }

    try {
      const sequelize = new Sequelize(buildSequelizeOptions(this.dbConfig[connType]));
      await sequelize.authenticate();

      this.dbClients[connType] = sequelize;
      log.info(`✅ [${connType}] Connection established`);
    } catch (error: any) {
      log.error(`❌ [${connType}] Unable to connect: ${error.message}`);
      // Rethrow so the application boot process knows the DB failed to connect
      throw error;
    }
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
      await client.close();
      delete this.dbClients[connType];
      log.info(`🔌 [${connType}] Connection closed`);
    } catch (error: any) {
      log.error(`❌ [${connType}] Error disconnecting: ${error.message}`);
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

  // return the db client
  public get db(): Sequelize | null {
    return this.dbClients.master ?? null;
  }

  public getDb(connType: keyof TDatasourceSchema): Sequelize | null {
    return this.dbClients[connType] ?? null;
  }
}

export const appDb = new Database();
