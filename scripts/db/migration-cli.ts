import ansis from 'ansis';
import { Command } from 'commander';
import { format } from 'date-fns';
import fs from 'fs';
import Mustache from 'mustache';
import path from 'path';
import { plural } from 'pluralize';
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

    const pluralTableName = plural(tableName.toLowerCase());

    const parsedColumns = options.columns
      ? options.columns.split(',').map((col) => col.trim())
      : [];

    const params = {
      table: pluralTableName,
      softDelete: options.softDelete,
    }
    const renderTemplate = Mustache.render(this.getMigrationTemplateContent(), params);

    const timestamp = format(new Date(), 'yyyyMMddHHmmss');
    const migrationFileName = `${timestamp}-create-${pluralTableName}.ts`;

    const exposeMigrationPath = path.resolve(`src/db/migrations/${migrationFileName}`);
    fs.mkdirSync(path.dirname(exposeMigrationPath), { recursive: true });
    fs.writeFileSync(exposeMigrationPath, renderTemplate, 'utf-8');

    console.log(ansis.greenBright.bold(`Migration created successfully: ${exposeMigrationPath}`));
  }

  private getMigrationTemplateContent() {
    const filePath = path.resolve(__dirname, 'template', 'migration.mustache');
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error: any) {
      throw new Error(`Cannot read migration template at ${filePath}`, { cause: error });
    }
  }
}

new MigrationCli().run();
