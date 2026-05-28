import { format } from 'date-fns';
import fs from 'fs';
import path from 'path';

export interface MigrationSeederConcernInterface {
  creationDir: string;
  templateFile: string;
  name: string;
}

export interface MigrationSeederConcernResultInterface {
  relativeFilePath: string;
  absoluteFilePath: string;
}

export class MigrationSeederConcern {
  constructor(private readonly configs: MigrationSeederConcernInterface) {}

  public execute(): MigrationSeederConcernResultInterface {
    const { creationDir, name, templateFile } = this.configs;

    this.validateName(name);

    // Create migration file with provided name and options.
    // Migration file name will be: `<timestamp>-<name>.ts`
    // The <name> will be converted to snake_case and prefixed with the current timestamp in the format of YYYYMMDDHHmmss.
    const timestamp = format(new Date(), 'yyyyMMddHHmmss');
    const fileName = `${timestamp}-${this.toSnakeCase(name)}.ts`;
    const filePath = path.join(creationDir, fileName);

    try {
      // Ensure the creation directory exists
      if (!fs.existsSync(creationDir)) {
        fs.mkdirSync(creationDir, { recursive: true }); // Create the directory if it doesn't exist
      }

      // Read the template content and write it to the new migration file
      const templateContent = fs.readFileSync(templateFile, 'utf8');
      fs.writeFileSync(filePath, templateContent, 'utf8');

      return {
        relativeFilePath: path.relative(process.cwd(), filePath),
        absoluteFilePath: filePath
      };
    } catch (error: any) {
      throw new Error(`Failed to create migration file: ${error.message}`);
    }
  }

  private validateName(name: string): void {
    if (!name) {
      throw new Error('Migration name is required');
    }

    // RegEx prevents path traversal attempts (.., /, \, etc.)
    if (name.includes('..') || name.includes('/') || name.includes('\\')) {
      throw new Error('Migration name must not contain path separators');
    }
  }

  private toSnakeCase(str: string): string {
    return str
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2') // Insert underscore between lowercase/number and uppercase
      .replace(/[\s-]+/g, '_') // Replace spaces and hyphens with a single underscore
      .toLowerCase(); // Convert to lowercase
  }
}
