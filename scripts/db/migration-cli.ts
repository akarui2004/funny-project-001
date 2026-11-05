import ansis from 'ansis';
import { Command } from 'commander';
import { format } from 'date-fns';
import fs from 'fs';
import path from 'path';
import { BaseCli } from 'scripts/base-cli';

interface MigrationOptions {
  module?: string;
}

const STUB = `import type { Kysely } from 'kysely';

// Kysely<any>: migrations run against whatever schema exists at this point in history.
// Column conventions (primaryKey, timestamps, softDelete, oneOf, nonNegative): src/db/migration-blueprint.ts
export async function up(db: Kysely<any>): Promise<void> {
}

export async function down(db: Kysely<any>): Promise<void> {
}
`;

/** Creates an empty timestamped migration; the body is written by hand with Kysely + src/db/migration-blueprint.ts. */
class MigrationCli extends BaseCli {
  protected name: string = 'create';
  protected description: string = 'Create an empty migration file';

  protected addArguments(command: Command): void {
    command.argument('<name>', 'Kebab-case description, e.g. create-wallets or add-status-to-users');
  }

  protected addOptions(command: Command): void {
    command.option('-m, --module <module>', 'Write into src/modules/<module>/migrations instead of src/db/migrations');
  }

  public execute(name: string, options: MigrationOptions): void {
    if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)) throw new Error(`Migration name "${name}" must be kebab-case`);

    const folder = options.module ? this.moduleFolder(options.module) : path.resolve('src/db/migrations');
    const filePath = path.join(folder, `${format(new Date(), 'yyyyMMddHHmmss')}-${name}.ts`);

    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(filePath, STUB, { encoding: 'utf-8', flag: 'wx' });
    console.log(ansis.greenBright.bold(`Migration created: ${filePath}`));
  }

  private moduleFolder(module: string): string {
    const moduleRoot = path.resolve('src/modules', module);
    if (!/^[a-z][a-z0-9-]*$/.test(module) || !fs.existsSync(moduleRoot)) throw new Error(`Unknown module "${module}"`);
    return path.join(moduleRoot, 'migrations');
  }
}

new MigrationCli().run();
