import ansis from 'ansis';
import { Argument, Command } from 'commander';
import type { MigrationResultSet } from 'kysely/migration';
import { BaseCli } from 'scripts/base-cli';
import { appDb } from 'src/app/connections/database';
import { createMigrator, MIGRATION_SOURCES } from 'src/db/migration-runner';
import type { MigrationSource } from 'src/db/migration-runner';

type MigrateAction = 'up' | 'down' | 'status';

interface MigrateOptions {
  source: string;
}

class MigrateCli extends BaseCli {
  protected name: string = 'migrate';
  protected description: string = 'Apply (up), undo one step (down) or list (status) database migrations';

  protected addArguments(command: Command): void {
    command.addArgument(new Argument('<action>', 'Migration action').choices(['up', 'down', 'status']));
  }

  protected addOptions(command: Command): void {
    command.option('-s, --source <name>', 'Migration source to undo with "down"', 'platform');
  }

  public async execute(action: MigrateAction, options: MigrateOptions): Promise<void> {
    await appDb.initialize('master');
    try {
      if (action === 'up') {
        for (const source of MIGRATION_SOURCES) await this.up(source);
      } else if (action === 'down') {
        await this.down(this.findSource(options.source));
      } else {
        for (const source of MIGRATION_SOURCES) await this.status(source);
      }
    } finally {
      // Always release the pool, otherwise the process hangs after an error
      await appDb.disconnectAll();
    }
  }

  private async up(source: MigrationSource): Promise<void> {
    console.log(ansis.blueBright.bold(`[${source.name}] Migrating to latest`));
    this.report(await createMigrator(appDb.getDb(), source).migrateToLatest());
  }

  private async down(source: MigrationSource): Promise<void> {
    console.log(ansis.blueBright.bold(`[${source.name}] Undoing the last migration`));
    this.report(await createMigrator(appDb.getDb(), source).migrateDown());
  }

  private async status(source: MigrationSource): Promise<void> {
    console.log(ansis.blueBright.bold(`[${source.name}] Migration status`));
    for (const migration of await createMigrator(appDb.getDb(), source).getMigrations()) {
      const state = migration.executedAt ? ansis.green(`executed ${migration.executedAt.toISOString()}`) : ansis.yellow('pending');
      console.log(`  ${migration.name}  ${state}`);
    }
  }

  // Kysely returns errors instead of throwing; rethrow so the CLI exits with code 1
  private report({ error, results }: MigrationResultSet): void {
    if (!results?.length && !error) console.log('  Nothing to do');
    for (const result of results ?? []) {
      const color = result.status === 'Success' ? ansis.green : result.status === 'Error' ? ansis.red : ansis.gray;
      console.log(`  ${color(result.status)} ${result.direction} ${result.migrationName}`);
    }
    if (error) throw error;
  }

  private findSource(name: string): MigrationSource {
    const source = MIGRATION_SOURCES.find((item) => item.name === name);
    if (!source) {
      throw new Error(`Unknown migration source "${name}". Known: ${MIGRATION_SOURCES.map((item) => item.name).join(', ')}`);
    }
    return source;
  }
}

new MigrateCli().run();
