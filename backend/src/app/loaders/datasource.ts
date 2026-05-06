import { Options, Sequelize } from 'sequelize';
import appConfig from '../config';
import { DSSchemaType } from '../schemas';

class Datasource {
  static #instance: Datasource;

  private defaultSource: string = 'default';

  private constructor() {}

  public static getInstance(): Datasource {
    if (!Datasource.#instance) {
      Datasource.#instance = new Datasource();
    }
    return Datasource.#instance;
  }

  public setSource(source: string) {
    this.defaultSource = source;
  }

  public async authenticate(): Promise<void> {
    const sequelizeConf = this.getDbSequelizeConfiguration(this.defaultSource);
    const sequelizeInstance = new Sequelize(sequelizeConf);

    try {
      await sequelizeInstance.authenticate();
      console.log(`Connection to datasource "${this.defaultSource}" has been established successfully.`);
    } catch (error) {
      console.error(`Unable to connect to the datasource "${this.defaultSource}":`, error);
      throw error; // Rethrow the error after logging
    }
  }

  public getDbSequelizeConfiguration(source: string): Options {
    const datasourceConf = appConfig.datasources?.[source as keyof typeof appConfig.datasources] as DSSchemaType | undefined;
    if (!datasourceConf) {
      throw new Error(`Datasource configuration for source "${source}" is missing.`);
    }

    return {
      dialect: datasourceConf.dialect,
      database: datasourceConf.database,
      username: datasourceConf.username,
      password: datasourceConf.password,
      host: datasourceConf.host,
      port: datasourceConf.port,
      pool: {
        max: datasourceConf.pool?.max || 5,
        min: datasourceConf.pool?.min || 0,
        acquire: datasourceConf.pool?.acquire || 30000,
        idle: datasourceConf.pool?.idle || 10000
      },
      ssl: datasourceConf.options?.ssl || false,
      dialectOptions: {
        timeout: datasourceConf.options?.connectTimeout || 10000
      }
    };
  }
}

const datasource = {
  init: async () => await Datasource.getInstance().authenticate(),
  setSource: (source: string) => Datasource.getInstance().setSource(source)
};

export default datasource;
