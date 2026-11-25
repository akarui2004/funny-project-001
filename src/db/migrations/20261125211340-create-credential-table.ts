import { sql, type Kysely } from 'kysely';
import { primaryKey, timestamps } from 'src/db/migration-blueprint';

// Kysely<any>: migrations run against whatever schema exists at this point in history.
// Column conventions (primaryKey, timestamps, softDelete, oneOf, nonNegative): src/db/migration-blueprint.ts
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createType('credential_type')
    .asEnum(['password', 'oauth', 'public_key', 'totp'])
    .execute();

  await db.schema
    .createTable('credentials')
    .$call(primaryKey)
    .addColumn('entityId', 'uuid', (col) => col.references('entities.id').onDelete('cascade').notNull())
    .addColumn('identifier', 'varchar(1024)', (col) => col.notNull())
    .addColumn('secret', 'varchar(2048)', (col) => col.notNull())
    .addColumn('type', sql`credential_type`, (col) => col.notNull().defaultTo('password'))
    .addUniqueConstraint('uniq_credential_identifier', ['entityId', 'type', 'identifier'])
    .$call(timestamps)
    .execute();

  await db.schema
    .createIndex('idx_auth_person_type')
    .on('credentials')
    .columns(['type', 'identifier'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('credentials').ifExists().execute();
  await db.schema.dropType('credential_type').ifExists().execute();
}
