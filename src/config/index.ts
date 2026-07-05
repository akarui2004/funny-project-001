import { APP } from 'src/constants';
import path from 'path';
import fs from 'fs';
import toml from 'toml';
import deepMerge from 'deepmerge';
import { ConfigSchema, TConfig } from './schema';

const CONFIG_FILE_SEQUENCE = ['base', APP.ENV, 'local'];
const loadConfigFiles = (): unknown => {
  const configFiles = CONFIG_FILE_SEQUENCE
    .map((fileName) => path.resolve(APP.CONFIG_DIR, `${fileName}.toml`))
    .filter((filePath) => fs.existsSync(filePath));

  if (configFiles.length === 0) throw new Error(`No configuration files found in ${APP.CONFIG_DIR}`);

  const configObj = configFiles.reduce((acc, filePath) => {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const parsedConfig = toml.parse(fileContent);
    return deepMerge(acc, parsedConfig);
  }, {});

  return configObj;
};

const configure = (): TConfig => {
  const configObj = loadConfigFiles();
  const validation = ConfigSchema.safeParse(configObj);
  if (!validation.success) {
    throw new Error(`Configuration validation failed: ${validation.error.message}`);
  }

  return validation.data;
}

const config = configure();

console.log(config);
