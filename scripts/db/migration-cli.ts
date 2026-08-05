import ansis from 'ansis';
import { Command } from 'commander';
import { BaseCli } from 'scripts/base-cli';

interface MigrationOptions {
  columns?: string;
  softDelete?: boolean;
}

class MigrationCli extends BaseCli {
  protected name: string = 'create';
  protected description: string = 'Perform a migration operation to act with migration file';

  protected addArguments(command: Command): void {
    command.argument('<table-name>', 'The table name');
  }

  protected addOptions(command: Command): void {
    command.option('-c, --columns <columns>', 'Column definitions (e.g., column_1:string,column_2:integer:index)')
      .option('--nsd, --no-soft-delete', 'Disable soft delete');
  }

  public async execute(tableName: string, options: MigrationOptions): Promise<void> {
    console.log(ansis.blueBright.bold(`Creating migration for table: ${tableName}`));

    const parsedColumns = options.columns
      ? options.columns.split(',').map((col) => col.trim())
      : [];

    console.log('Columns: ', parsedColumns);
    console.log('Soft Delete: ', options.softDelete);

    // TODO: The rest of the code will be here
  }
}

new MigrationCli().run();
