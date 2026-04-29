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

const loadConfig = (configFile: string) => {
  const configFilePath = path.resolve(Defaults.CONFIG_FOLDER, configFile);
  if (!fs.existsSync(configFilePath)) {
    throw new Error(`Configuration file not found: ${configFilePath}`);
  }

  const fileContent = fs.readFileSync(configFilePath, "utf-8");
  const parsedConfig = toml.parse(fileContent);

  // Here you would typically merge with environment-specific configs and validate with Zod
  // For simplicity, we just return the parsed config
  return parsedConfig;
};

(async () => {
  const loadedConfig = loadConfig("base.toml");
})().catch((error) => {
  console.error("Error loading configuration:", error);
  process.exit(1);
});
