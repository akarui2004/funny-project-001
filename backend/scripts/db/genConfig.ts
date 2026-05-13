require('src/setup');

import { DSSchemaType } from 'src/app/schemas';
import { appConfig } from 'src/app';
import path from 'path';
import fs from 'fs';

interface DbConfig {
  username: string;
  password: string;
  database: string;
  host: string;
  port: number;
  dialect: string;
}

(async () => {
  const env = process.env.NODE_ENV || 'development';

  const defaultDb: DSSchemaType | undefined = appConfig.datasources?.default;
  if (!defaultDb) {
    throw new Error(`Database configuration failed: 'default' datasource not found for environment: ${env}`);
  }

  const { username, password, database, host, port, dialect } = defaultDb;
  const sequelizeJsonConf: Record<string, DbConfig> = {
    [env]: { username, password, database, host, port, dialect }
  };

  // Output json config path
  const outputPath = path.resolve(process.cwd(), 'config', 'datasource', 'config.json');
  const jsonString = JSON.stringify(sequelizeJsonConf, null, 2); // Format JSON string

  fs.writeFileSync(outputPath, jsonString, 'utf8'); // Write content into file

  console.log(`Successfully generated: ${outputPath}`);
})().catch((err) => {
  console.error('Failed to generate config:', err);
  process.exit(1);
});
