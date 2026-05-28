require('src/setup');

import fs from 'fs';
import path from 'path';
import { appConfig } from 'src/app';
import { DSSchemaType } from 'src/app/schemas';
import { BaseProgram, CommandArgumentInterface } from '../BaseProgram';

interface DbConfig {
  username: string;
  password: string;
  database: string;
  host: string;
  port: number;
  dialect: string;
}

class GenConfig extends BaseProgram {
  commandName(): string {
    return 'gen-config';
  }

  commandDescription(): string {
    return 'Generate database configuration file from appConfig';
  }

  commandArguments(): Array<CommandArgumentInterface> {
    return [];
  }

  commandOptions(): Array<CommandArgumentInterface> {
    return [];
  }

  actionExecutor(..._args: any): void {
    const env = process.env.NODE_ENV || 'development';

    const defaultDb: DSSchemaType | undefined = appConfig.datasources?.default;
    if (!defaultDb) {
      console.error(
        this.prettyPrinter.red(
          `Database configuration failed: 'default' datasource not found for environment: ${env}`
        )
      );
      return;
    }

    try {
      const { username, password, database, host, port, dialect } = defaultDb;
      const sequelizeJsonConf: Record<string, DbConfig> = {
        [env]: { username, password, database, host, port, dialect }
      };

      // Output json config path
      const outputPath = path.resolve(
        process.cwd(),
        'config',
        'datasource',
        'config.json'
      );
      const jsonString = JSON.stringify(sequelizeJsonConf, null, 2); // Format JSON string

      fs.writeFileSync(outputPath, jsonString, 'utf8'); // Write content into file

      console.log(
        this.prettyPrinter.green(
          `Database configuration file generated successfully at: ${path.relative(process.cwd(), outputPath)}`
        )
      );
    } catch (error: any) {
      console.error(
        this.prettyPrinter.red(
          `Error generating database configuration file: ${error.message}`
        )
      );
    }
  }
}

const program = new GenConfig();
program.execute();
