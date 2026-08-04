import fs from 'fs';
import path from 'path';
import toml from 'toml';

export interface SequelizeDatasourceCLI {
  username: string;
  password: string;
  dialect: string;
  schema: string;
  database: string;
  host: string;
  port: number;
}

const REQUIRED_KEYS: (keyof SequelizeDatasourceCLI)[] = [
  'username',
  'password',
  'dialect',
  'schema',
  'database',
  'host',
  'port',
];

// 1. Explicitly define the function type signature with the assertion return
type ValidateDatabaseConfig = (
  config: Partial<SequelizeDatasourceCLI>
) => asserts config is SequelizeDatasourceCLI;

// 2. Annotate the const variable with the type
const validateDatabaseConfig: ValidateDatabaseConfig = (config) => {
  const missingKeys = REQUIRED_KEYS.filter(
    (key) => config[key] === undefined || config[key] === null || config[key] === ''
  );

  if (missingKeys.length > 0) {
    throw new Error(
      `[Database Configuration Error]: Missing or empty required configuration keys:\n` +
      `  - ${missingKeys.join('\n  - ')}\n` +
      `Please ensure these attributes are defined across base.toml, <env>.toml, or <env>.local.toml.`
    );
  }
};

const loadDatabaseConf = (): SequelizeDatasourceCLI => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const seqConfFiles = ['base.toml', `${nodeEnv}.toml`, `${nodeEnv}.local.toml`];

  let dbConfig: Partial<SequelizeDatasourceCLI> = {};

  for (const confFile of seqConfFiles) {
    const tomlFilePath = path.resolve(process.cwd(), 'config', confFile);

    if (!fs.existsSync(tomlFilePath)) continue;

    const fileContent = fs.readFileSync(tomlFilePath, 'utf-8');
    const tomlData = toml.parse(fileContent);

    const masterConfig = tomlData?.datasource?.master;
    if (!masterConfig) continue;

    dbConfig = {
      ...dbConfig,
      ...masterConfig,
    };
  }

  validateDatabaseConfig(dbConfig);

  return dbConfig as SequelizeDatasourceCLI;
};

const env = process.env.NODE_ENV || 'development';

const config: Record<string, SequelizeDatasourceCLI> = {
  [env]: loadDatabaseConf(),
};

export default config;
