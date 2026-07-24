import fs from 'fs';
import path from 'path';
import toml from 'toml';

// need to combine all the toml follow by the env
// load sequence by file base.toml -> {env}.toml -> {env.local}.toml
// nested merge object/array data
const tomlFilePath = path.resolve(process.cwd(), 'config', 'development.local.toml');

const fileContent = fs.readFileSync(tomlFilePath, 'utf-8');
const parsedConfig = toml.parse(fileContent);

const { username, password, dialect, schema, database, host, port } = parsedConfig.datasource.master;
const env = process.env.NODE_ENV || 'development';

const config: Record<string, any> = {
  [env]: {
    username,
    password,
    dialect,
    schema,
    database,
    host,
    port,
  },
};

export default config;