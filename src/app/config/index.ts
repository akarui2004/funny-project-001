import { defu } from 'defu';
import fs from 'fs';
import { EOL } from 'os';
import path from 'path';
import { Defaults, NODE_ENV } from 'src/constants';
import { createModuleLogger } from 'src/utils/logger';
import Toml from 'toml';
import { CONFIG_SCHEMA, TConfigSchema } from './config.type';

const log = createModuleLogger('config');

class ConfigManager {
  // Multiple environment setups for the main config
  private primaryConfigFiles: Array<string> = ['base.toml', `${NODE_ENV}.toml`, `${NODE_ENV}.local.toml`];
  private _cachedConfig: TConfigSchema | null = null;
  // Config files that were actually merged, in merge order
  protected _loadedFiles: Array<string> = [];

  protected get raw(): TConfigSchema {
    if (!this._cachedConfig) {
      log.info(`🚀 Reading TOML files from ${Defaults.CONFIG_DIR}`);
      this._cachedConfig = this.resolvedConfig();
    }

    return this._cachedConfig;
  }

  private resolvedConfig(): TConfigSchema {
    let _tomlObj = {};
    for (const configFile of this.primaryConfigFiles) {
      const configPath = path.resolve(Defaults.CONFIG_DIR, configFile);
      const isOptional = configFile.endsWith(`.local.toml`);
      if (!fs.existsSync(configPath)) {
        if (isOptional) {
          log.info(`🗄️  Skipped ${configFile} (optional, not found)`);
          continue; // skip local override file safety if missing
        }
        throw new Error(`Required config file "${configFile}" does not exist in config path: ${Defaults.CONFIG_DIR}`);
      }

      const tomlData = this.loadEnvFile(configPath);
      // defu priority is left-to-right, so local overrides env, which overrides base
      _tomlObj = defu(tomlData, _tomlObj);
      this._loadedFiles.push(configFile);
      log.info(`🗄️  Loaded ${configFile}`);
    }

    return this.validateSchema(_tomlObj);
  }

  private loadEnvFile(configPath: string) {
    const tomlContent = Toml.parse(fs.readFileSync(configPath, 'utf-8'));
    return tomlContent;
  }

  private validateSchema(rawConfigData: unknown): TConfigSchema {
    const result = CONFIG_SCHEMA.safeParse(rawConfigData);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => {
        const path = issue.path.join(".");
        return `  - ${path || "(root)"}: ${issue.message}`;
      });

      const errorMessage = ["Config validation warning:", ...errors].join(EOL);
      throw new Error(errorMessage);
    }

    return result.data;
  }
}

class AppConfig extends ConfigManager {
  public get loadedFiles(): ReadonlyArray<string> {
    this.raw; // make sure the files have been read
    return this._loadedFiles;
  }
  public get env() { return this.raw.env; }
  public get datasource() { return this.raw.datasource; }
  public get redis() { return this.raw.redis; }
}

const config = new AppConfig();
export default config;
