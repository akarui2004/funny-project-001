import { format } from 'date-fns';
import fs from 'fs';
import path from 'path';
import { BaseProgram, CommandArgumentInterface } from '../BaseProgram';

class CreateMigrationProgram extends BaseProgram {
  private readonly MIGRATION_DIR = path.resolve(
    process.cwd(),
    'src',
    'app',
    'db',
    'migrations'
  );

  private readonly TEMPLATE_FILE = path.resolve(
    __dirname,
    '..',
    'db',
    'templates',
    'create-migration.tpl'
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
    const [name, options] = args;
    // Create migration file with provided name and options.
    // Migration file name will be: `<timestamp>-<name>.ts`
    // The <name> will be converted to snake_case and prefixed with the current timestamp in the format of YYYYMMDDHHmmss.
    const timestamp = format(new Date(), 'yyyyMMddHHmmss');
    const fileName = `${timestamp}-${this.toSnakeCase(name)}.ts`;
    const filePath = path.join(this.MIGRATION_DIR, fileName);

    try {
      if (!fs.existsSync(this.MIGRATION_DIR)) {
        fs.mkdirSync(this.MIGRATION_DIR, { recursive: true }); // Create the directory if it doesn't exist
      }

      const templateContent = fs.readFileSync(this.TEMPLATE_FILE, 'utf8');
      fs.writeFileSync(filePath, templateContent, 'utf8');

      console.log(
        this.prettyPrinter.green(
          `Migration file created successfully: ${fileName}`
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

  private toSnakeCase(str: string): string {
    return str
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2') // Insert underscore between lowercase/number and uppercase
      .replace(/[\s-]+/g, '_') // Replace spaces and hyphens with a single underscore
      .toLowerCase(); // Convert to lowercase
  }
}

const program = new CreateMigrationProgram();
program.execute();
