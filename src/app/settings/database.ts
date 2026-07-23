import ansis from 'ansis';
import { Dialect, Sequelize, Options as SequelizeOptions } from 'sequelize';
import { appConfig } from 'src/app';
import { TMasterDatasourceSchema } from '../config/config.type';

class Database {
  private masterDbSetting: TMasterDatasourceSchema;
  private dbClient: Sequelize | null = null;

  public constructor() {
    this.masterDbSetting = appConfig.datasource.master;
  }

  public async initialize() {
    try {
      const sequelize = new Sequelize(this.buildSequelizeOption());
      await sequelize.authenticate();

      this.dbClient = sequelize;
      console.log(ansis.greenBright.bold('✅ DB connection has been established successfully. 🚀'));
    } catch (error: any) {
      console.error(ansis.red.bold('❌ Unable to connect to the database:'), error.message);
      // Rethrow so the application boot process knows the DB failed to connect
      throw error;
    }
  }

  private buildSequelizeOption(): SequelizeOptions {
    const {
      dialect, host, port,
      schema, database,
      username, password,
      pool: poolOptions, option: otherOptions
    } = this.masterDbSetting;
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

  // return the db client
  public get db(): Sequelize | null {
    return this.dbClient;
  }
}

export const appDb = new Database();
