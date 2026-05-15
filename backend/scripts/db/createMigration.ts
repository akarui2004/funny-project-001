import { BaseProgram, CommandArgumentInterface } from '../BaseProgram';

class CreateMigrationProgram extends BaseProgram {
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
    const [name, options] = args;
    console.log(
      this.prettyPrinter.green(
        `Creating migration: ${name} with options: ${options}`
      )
    );
  }
}

const program = new CreateMigrationProgram();
program.execute();
