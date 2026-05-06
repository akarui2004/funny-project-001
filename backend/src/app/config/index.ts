import deepmerge from 'deepmerge';
import fs from 'fs';
import path from 'path';
import toml from 'toml';
import { BaseConfig, BaseConfigSchema } from '../schemas';

class ConfigLoader {
  static #instance: ConfigLoader;

  // Class constants
  private readonly DEFAULT_CONFIG_DIR = 'config';
  private readonly CONFIG_FILES = ['base', process.env.NODE_ENV || 'development', 'local'];

  // Cache to store parsed configurations to avoid redundant parsing
  private parsedCaches: Map<string, BaseConfig> = new Map();
  private configPath: string;

  // Singleton pattern to ensure only one instance of ConfigLoader exists
  private constructor() {
    this.configPath = path.resolve(process.cwd(), this.DEFAULT_CONFIG_DIR);
  }

  public static getInstance(): ConfigLoader {
    if (!ConfigLoader.#instance) {
      ConfigLoader.#instance = new ConfigLoader();
    }

    return ConfigLoader.#instance;
  }

  public setConfigDir(configDir: string) {
    this.configPath = path.resolve(process.cwd(), configDir);
  }

  public configure() {
    // Load and parse configuration files
    this.loadConfigFiles();

    // Merge the parsed configurations and validate against the schema
    const mergedConfig = this.mergeConfigs();
    const validatedConfig = this.validateConfigSchema(mergedConfig);

    Object.assign(config, validatedConfig); // Update the exported config object with the validated configuration
  }

  /**
   * Loads and parses the configuration files specified in the CONFIG_FILES array.
   * @returns A promise that resolves when all configuration files have been loaded and parsed.
   */
  private loadConfigFiles(): void {
    const pathToRead = this.CONFIG_FILES.filter((file) => !this.parsedCaches.has(file));

    if (pathToRead.length === 0) return; // All files are already cached, no need to load

    const results = pathToRead.map((file) => this.parseConfigFile(file));
    results.forEach(({ file, data }) => {
      // Update cache with new parsed configurations
      this.parsedCaches.set(file, data);
    });
  }

  /**
   * Parses a TOML configuration file and returns its content as a JavaScript object.
   *
   * @param fileName - The path to the TOML configuration file to be parsed.
   * @returns An object containing the file path and the parsed data.
   */
  private parseConfigFile(fileName: string): { file: string; data: any } {
    const filePath = path.resolve(this.configPath, `${fileName}.toml`);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = toml.parse(content);
      return { file: fileName, data };
    } catch (error: any) {
      // TODO: write to logger instead of console.warning
      return { file: fileName, data: {} };
    }
  }

  /**
   * Merges the parsed configuration objects from the cache in the order specified by CONFIG_FILES.
   * @returns The final merged configuration object.
   */
  private mergeConfigs(): any {
    let finalConfig: any = {};

    for (const file of this.CONFIG_FILES) {
      const configData = this.parsedCaches.get(file);
      if (configData) {
        finalConfig = deepmerge(finalConfig, configData);
      }
    }

    return finalConfig;
  }

  /**
   * Validates the merged configuration object against the BaseConfigSchema using Zod.
   * @param config - The merged configuration object to be validated.
   * @returns The validated configuration object if validation is successful.
   * @throws An error if validation fails, containing details about the validation errors.
   */
  private validateConfigSchema(config: any): BaseConfig {
    const validation = BaseConfigSchema.safeParse(config);
    if (!validation.success) {
      throw new Error(`Configuration validation failed: ${validation.error.message}`);
    }

    return validation.data;
  }

  public clearCache() {
    this.parsedCaches.clear();
    // clear the exported config object to reset to an empty state
    Object.keys(config).forEach((key) => delete config[key as keyof BaseConfig]);
  }
}

const config = {
  __configure: () => ConfigLoader.getInstance().configure(),
  __clearCache: () => ConfigLoader.getInstance().clearCache()
} as BaseConfig;
export default config;
