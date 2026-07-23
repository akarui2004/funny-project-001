import ansis from 'ansis';
import { Dialect, Sequelize, Options as SequelizeOptions } from 'sequelize';
import { appConfig } from 'src/app';
import { TDatasourceSchema, TMasterDatasourceSchema } from '../config/config.type';

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
      const sequelize = new Sequelize(this.buildSequelizeOption(connType));
      await sequelize.authenticate();

      this.dbClients[connType] = sequelize;
      console.log(ansis.greenBright.bold(`✅ DB [${String(connType)}] connection established successfully. 🚀`));
    } catch (error: any) {
      console.error(ansis.red.bold(`❌ Unable to connect to DB [${String(connType)}]:`), error.message);
      // Rethrow so the application boot process knows the DB failed to connect
      throw error;
    }
  }

  private buildSequelizeOption(connType: keyof TDatasourceSchema = 'master'): SequelizeOptions {
    const {
      dialect, host, port,
      schema, database,
      username, password,
      pool: poolOptions, option: otherOptions
    } = this.dbConfig[connType];
    const { min, max, idle, acquireTimeout: acquire } = poolOptions;
    const { ssl, connectionTimeout: connectTimeout } = otherOptions;
    return {
      dialect: dialect as Dialect,
      host, port,
      schema, database,
      username, password,
      pool: { min, max, acquire, idle },
      dialectOptions: { ssl, connectTimeout },
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
      console.log(
        ansis.yellow.bold(`🔌 DB [${String(connType)}] connection closed successfully.`)
      );
    } catch (error: any) {
      console.error(
        ansis.red.bold(`❌ Error disconnecting DB [${String(connType)}]:`),
        error.message
      );
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
