import fs from 'fs/promises';
import path from 'path';
import type { Kysely } from 'kysely';
import { Migrator } from 'kysely/migration';
import type { Migration, MigrationProvider } from 'kysely/migration';

/**
 * One folder of migrations with its own tracking tables (`<name>_migration`, `<name>_migration_lock`),
 * so each module can own its migrations. Order across sources does not matter: cross-module FKs are banned.
 */
export type MigrationSource = { name: string; folder: string };

export const PLATFORM_MIGRATION_SOURCE: MigrationSource = { name: 'platform', folder: path.resolve(__dirname, 'migrations') };

export const MIGRATION_SOURCES: MigrationSource[] = [PLATFORM_MIGRATION_SOURCE];

/**
 * Loads migrations with require() instead of Kysely's FileMigrationProvider, so they go through the same
 * CommonJS loader as the rest of the app (tsx in `yarn script`, plain node on dist) and `src/*` imports resolve.
 * Migration name = file name without extension, identical for `.ts` (yarn script) and compiled `.js` (dist).
 */
export class RequireMigrationProvider implements MigrationProvider {
  public constructor(private readonly folder: string) {}

  public async getMigrations(): Promise<Record<string, Migration>> {
    const files = (await fs.readdir(this.folder))
      .filter((file) => /\.(ts|js)$/.test(file) && !file.endsWith('.d.ts'))
      .sort();
    return Object.fromEntries(files.map((file) => [path.parse(file).name, require(path.join(this.folder, file)) as Migration]));
  }
}

// Kysely<any> is allowed here and in migrations only: they run against whatever schema exists at that point in history
export const createMigrator = (db: Kysely<any>, source: MigrationSource): Migrator => {
  // The name becomes part of a table name
  if (!/^[a-z][a-z0-9_]*$/.test(source.name)) {
    throw new Error(`Invalid migration source name "${source.name}": use lowercase letters, digits and underscores`);
  }
  return new Migrator({
    db,
    provider: new RequireMigrationProvider(source.folder),
    migrationTableName: `${source.name}_migration`,
    migrationLockTableName: `${source.name}_migration_lock`,
  });
};
