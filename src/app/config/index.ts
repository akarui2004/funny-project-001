import ansis from 'ansis';
import { defu } from 'defu';
import fs from 'fs';
import path from 'path';
import { Defaults, NODE_ENV } from 'src/constants';
import Toml from 'toml';
import { AppConfig, CONFIG_SCHEMA, TConfigSchema } from "./config.type";

// TODO: Updates the implementation to defer class loading and apply the caching framework

class ConfigManager {
  // Multiple environment setups for the main config
  private primaryConfigEnvs: Array<string> = ['base', NODE_ENV, `${NODE_ENV}.local`];
  private _cachedConfig: TConfigSchema | null = null;

  private get raw(): TConfigSchema | null {
    if (!this._cachedConfig) {
      // Load the config in here
    }

    return this._cachedConfig;
  }

  private resolvedConfig() {
    // const configData: TConfigSchema = {} as TConfigSchema;
  }

  private loadPrimaryEnvFiles(fullFileName: string) {
    const configPath = path.resolve()
  }

  public getLogDir(): string {
    return Defaults.CONFIG_DIF;
  }
}

// const loadFile = (fileName: string): unknown => {
//   const configPath = path.resolve(config.__configFolder, fileName);
//   if (!fs.existsSync(configPath)) {
//     console.log(ansis.yellow.bold(`Configuration file does not exist: ${fileName} at ${config.__configFolder}`))
//     process.exit(1);
//   }

//   try {
//     const toml = Toml.parse(fs.readFileSync(configPath, 'utf-8'));
//     if (toml.__configure || toml.__configFolder) {
//       throw new Error('Invalid configuration: __configure and __configFolder are reserved keywords and cannot be set in the TOML file.')
//     }
//     return toml;
//   } catch (error: any) {
//     console.log(ansis.red.bold(error.message ?? 'Unknow error'));
//     process.exit(1);
//   }
// }

// const validateSchema = (rawConfig: unknown) => {
//   const result = ROOT_CONFIG_SCHEMA.safeParse(rawConfig);

//   if (!result.success) {
//     const errors = result.error.issues.map((issue) => {
//       const path = issue.path.join(".");
//       return `  - ${path || "(root)"}: ${issue.message}`;
//     });

//     const errorMessage = [
//       "Config validation warning:",
//       ...errors,
//     ].join("\n");

//     console.log(ansis.red.bold(errorMessage));
//     process.exit(1);
//   }
// }

// const configure = (configFolder: string) => {
//   config.__configFolder = configFolder;
//   const configEnvs = ['base', NODE_ENV, `${NODE_ENV}.local`]; // we can load more into here in the future

//   for (const env of configEnvs) {
//     const configData = loadFile(`${env}.toml`)
//     if (configData) {
//       const mergedConfigDefu = defu(configData, config);
//       Object.assign(config, mergedConfigDefu);
//     }
//   }

//   validateSchema(config);
// }

// const config = { __configure: configure } as AppConfig;

// export default config;
