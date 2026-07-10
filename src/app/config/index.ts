import { defu } from 'defu';
import fs from 'fs';
import path from 'path';
import { NODE_ENV } from 'src/constants';
import Toml from 'toml';
import { AppConfig, ROOT_CONFIG_SCHEMA } from "./config.type";

const loadFile = (fileName: string): unknown => {
  const configPath = path.resolve(config.__configFolder, fileName);
  if (!fs.existsSync(configPath)) {
    // throw new Error(`Configuration file does not exist: ${fileName} at ${config.__configFolder}`)
    // Write log here instead of raise error
    return;
  }

  try {
    const toml = Toml.parse(fs.readFileSync(configPath, 'utf-8'));
    if (toml.__configure || toml.__configFolder) {
      // throw new Error('Invalid configuration: __configure and __configFolder are reserved keywords and cannot be set in the TOML file.')
      // Write log here instead of raise error
    }
    return toml;
  } catch (error: any) {
    // Write log in here instead of raise error
  }
}

const validateSchema = (rawConfig: unknown) => {
  const result = ROOT_CONFIG_SCHEMA.safeParse(rawConfig);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => {
      const path = issue.path.join(".");
      return `  - ${path || "(root)"}: ${issue.message}`;
    });

    const errorMessage = [
      "Config validation warning:",
      ...errors,
    ].join("\n");

    throw new Error(errorMessage)
  }
}

const configure = (configFolder: string) => {
  config.__configFolder = configFolder;
  const configEnvs = ['base', NODE_ENV, `${NODE_ENV}.local`]; // we can load more into here in the future

  for (const env of configEnvs) {
    const configData = loadFile(`${env}.toml`)
    if (configData) {
      const mergedConfigDefu = defu(configData, config);
      Object.assign(config, mergedConfigDefu);
    }
  }

  validateSchema(config);
}

const config = { __configure: configure } as AppConfig;

export default config;
