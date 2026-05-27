import path from 'path';
import { BaseProgram, CommandArgumentInterface } from '../BaseProgram';
import {
  MigrationSeederConcern,
  MigrationSeederConcernInterface
} from './concern';

class CreateSeederProgram extends BaseProgram {
  private readonly SEEDER_DIR = path.resolve(
    process.cwd(),
    'src',
    'app',
    'db',
    'seeders'
  );

  private readonly TEMPLATE_FILE = path.resolve(
    process.cwd(),
    'scripts',
    'db',
    'templates',
    'create-migration-seeder.tpl'
  );

  commandName(): string {
    return 'create-seeder';
  }

  commandDescription(): string {
    return 'Create a new seeder file';
  }

  commandArguments(): Array<CommandArgumentInterface> {
    return [
      { name: '<name>', desc: 'Name of the seeder' },
      { name: '[options]', desc: 'Additional options for the seeder' }
    ];
  }

  commandOptions(): Array<CommandArgumentInterface> {
    return [];
  }

  actionExecutor(...args: any): void {
    const [name, _options] = args; // Currently, options are not used, but they can be implemented in the future.

    try {
      const msConcernConfigs: MigrationSeederConcernInterface = {
        creationDir: this.SEEDER_DIR,
        templateFile: this.TEMPLATE_FILE,
        name: name
      };
      const msConcern = new MigrationSeederConcern(msConcernConfigs);
      const { relativeFilePath } = msConcern.execute();
      console.log(
        this.prettyPrinter.green(
          `Seeder file created successfully: ${relativeFilePath}`
        )
      );
    } catch (error: any) {
      console.log(
        this.prettyPrinter.red(`Failed to create seeder file: ${error.message}`)
      );
    }
  }
}

const program = new CreateSeederProgram();
program.execute();
