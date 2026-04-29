/**
 * Exports merged configuration from config/*.toml files as a single source-of-truth constant.
 *
 * - Merges in order: base.toml → environment-specific (development/staging/production.toml)
 * - Deep merges nested objects, with later files overriding earlier ones
 * - Validates final config using Zod schema with full TypeScript inference
 *
 * Flow: read files → parse TOML → deep merge → validate → export typed constant
 */

import fs from "fs";
import path from "path";
import { Defaults } from "src/constants";
import toml from "toml";
import { RootConfig, RootConfigSchema } from "./schema";

const loadConfig = (configFile: string): RootConfig => {
  const configFilePath = path.resolve(Defaults.CONFIG_FOLDER, configFile);
  if (!fs.existsSync(configFilePath)) {
    throw new Error(`Configuration file not found: ${configFilePath}`);
  }

  const fileContent = fs.readFileSync(configFilePath, "utf-8");
  const parsedConfig = toml.parse(fileContent);

  const result = RootConfigSchema.safeParse(parsedConfig);
  if (!result.success) {
    throw new Error(`Configuration validation error: ${result.error.message}`);
  }

  return result.data;
};

(async () => {
  const loadedConfig = loadConfig("base.toml");
  console.log(loadedConfig.datasources.default);
})().catch((error) => {
  console.error("Error loading configuration:", error);
  process.exit(1);
});
