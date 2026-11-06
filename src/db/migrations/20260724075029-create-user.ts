import { sql } from 'kysely';
import type { Kysely } from 'kysely';

// Must stay schema-identical to the table Sequelize created for this migration; databases that already
// have it skip it through IF NOT EXISTS / to_regtype checks. Hand-written on purpose (no blueprint helpers)
// so later blueprint changes never alter history.
export async function up(db: Kysely<any>): Promise<void> {
  // Sequelize named enum types enum_<table>_<column>; keep the name so existing databases match
  // Postgres has no CREATE TYPE IF NOT EXISTS; to_regtype resolves via search_path and is NULL when absent
  const { rows } = await sql<{ type: string | null }>`SELECT to_regtype('enum_users_role') AS type`.execute(db);
  if (!rows[0]?.type) {
    await db.schema.createType('enum_users_role')
      .asEnum(['admin', 'sub-admin', 'member', 'guest'])
      .execute();
  }

  await db.schema.createTable('users').ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey().notNull())
    .addColumn('username', 'varchar(255)', (col) => col.notNull())
    .addColumn('password', 'varchar(255)', (col) => col.notNull())
    .addColumn('role', sql`"enum_users_role"`, (col) => col.defaultTo('guest'))
    .addColumn('deletedAt', 'timestamptz')
    .addColumn('createdAt', 'timestamptz', (col) => col.notNull())
    .addColumn('updatedAt', 'timestamptz', (col) => col.notNull())
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('users').ifExists().execute();
  await db.schema.dropType('enum_users_role').ifExists().execute();
}
