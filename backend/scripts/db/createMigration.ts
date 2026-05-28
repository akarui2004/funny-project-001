import path from 'path';
import { BaseProgram, CommandArgumentInterface } from '../BaseProgram';
import {
  MigrationSeederConcern,
  MigrationSeederConcernInterface
} from './concern';

class CreateMigrationProgram extends BaseProgram {
  private readonly MIGRATION_DIR = path.resolve(
    process.cwd(),
    'src',
    'app',
    'db',
    'migrations'
  );

  private readonly TEMPLATE_FILE = path.resolve(
    process.cwd(),
    'scripts',
    'db',
    'templates',
    'create-migration-seeder.tpl'
  );

  commandName(): string {
    return 'create-migration';
  }

  commandDescription(): string {
    return 'Create a new migration file';
  }

  commandArguments(): Array<CommandArgumentInterface> {
    return [
      { name: '<name>', desc: 'Name of the migration' },
      { name: '[options]', desc: 'Additional options for the migration' }
    ];
  }

  commandOptions(): Array<CommandArgumentInterface> {
    return [];
  }

  actionExecutor(...args: any): void {
    const [name, _options] = args; // Currently, options are not used, but they can be implemented in the future.

    try {
      const msConcernConfigs: MigrationSeederConcernInterface = {
        creationDir: this.MIGRATION_DIR,
        templateFile: this.TEMPLATE_FILE,
        name: name
      };
      const msConcern = new MigrationSeederConcern(msConcernConfigs);
      const { relativeFilePath } = msConcern.execute();
      console.log(
        this.prettyPrinter.green(
          `Migration file created successfully: ${relativeFilePath}`
        )
      );
    } catch (error: any) {
      console.log(
        this.prettyPrinter.red(
          `Failed to create migration file: ${error.message}`
        )
      );
    }
  }
}

const program = new CreateMigrationProgram();
program.execute();
