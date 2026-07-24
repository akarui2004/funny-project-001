import ansis from 'ansis';
import fs from 'fs';
import path from 'path';
import { appConfig } from 'src/app';
import { Defaults, NODE_ENV } from 'src/constants';

(async () => {
  const { username, password, dialect, schema, database, host, port } = appConfig.datasource.master;

  const sequelizeConf: Record<string, any> = {
    [NODE_ENV]: {
      username,
      password,
      dialect,
      schema,
      database,
      host,
      port,
    },
  };

  const filePath = path.resolve('dist', 'config', 'sequelize_db.js');
  const fileContent = `module.exports = ${JSON.stringify(sequelizeConf, null, 2)};\n`;

  // force create the dist folder
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  fs.writeFileSync(filePath, fileContent, 'utf-8');
  console.log(ansis.greenBright(`[Script - GenConfig] Successfully generated config at: ${filePath}`));
})().catch((err: any) => {
  console.error(ansis.redBright.bold('[Script - GenConfig] Failed:'), err.message);
  process.exit(1);
});