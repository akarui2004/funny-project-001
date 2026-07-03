import { APP } from 'src/constants';
import path from 'path';
import fs from 'fs';
import toml from 'toml';
import deepMerge from 'deepmerge';

const CONFIG_FILE_SEQUENCE = ['base', APP.ENV, 'local'];
const loadConfigFiles = (): unknown => {
  const configFiles = CONFIG_FILE_SEQUENCE
    .map((fileName) => path.resolve(APP.CONFIG_DIR, `${fileName}.toml`))
    .filter((filePath) => fs.existsSync(filePath));

  if (configFiles.length === 0) throw new Error(`No configuration files found in ${APP.CONFIG_DIR}`);

  const config = configFiles.reduce((acc, filePath) => {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const parsedConfig = toml.parse(fileContent);
    return deepMerge(acc, parsedConfig);
  }, {});

  return config;
};

const configure = () => {
  const _config = loadConfigFiles();
}

console.log(loadConfigFiles());
