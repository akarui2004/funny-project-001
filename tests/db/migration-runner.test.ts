import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import type { Kysely } from 'kysely';
import { createMigrator, RequireMigrationProvider } from 'src/db/migration-runner';

describe('RequireMigrationProvider', () => {
  let folder = '';

  before(async () => {
    folder = await fs.mkdtemp(path.join(os.tmpdir(), 'migrations-'));
    const migration = 'exports.up = async () => {}; exports.down = async () => {};';
    await fs.writeFile(path.join(folder, '002-b.js'), migration);
    await fs.writeFile(path.join(folder, '001-a.js'), migration);
    await fs.writeFile(path.join(folder, 'x.d.ts'), '');
    await fs.writeFile(path.join(folder, 'readme.md'), '');
  });

  after(async () => fs.rm(folder, { recursive: true, force: true }));

  it('which files load: only .ts/.js migrations, sorted, keyed by name without extension', async () => {
    const migrations = await new RequireMigrationProvider(folder).getMigrations();
    assert.deepEqual(Object.keys(migrations), ['001-a', '002-b']);
    assert.equal(typeof migrations['001-a']!.up, 'function');
  });
});

describe('createMigrator', () => {
  it('given a source name that is not a plain identifier, throws', () => {
    assert.throws(() => createMigrator({} as Kysely<any>, { name: 'Bad-Name', folder: '.' }), /Invalid migration source name/);
  });
});
