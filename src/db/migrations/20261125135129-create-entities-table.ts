import type { Kysely } from 'kysely';
import { oneOf, primaryKey, softDelete, timestamps } from 'src/db/migration-blueprint';

// Kysely<any>: migrations run against whatever schema exists at this point in history.
// Column conventions (primaryKey, timestamps, softDelete, oneOf, nonNegative): src/db/migration-blueprint.ts
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('users')
    .$call(primaryKey)
    .addColumn('firstName', 'varchar(2048)', (col) => col.notNull())
    .addColumn('lastName', 'varchar(2048)')
    .addColumn('email', 'varchar(2048)', (col) => col.notNull())
    .addColumn('mobile', 'varchar(64)', (col) => col.notNull())
    .addColumn('homePhone', 'varchar(64)', (col) => col.notNull())
    .addColumn('address', 'text')
    .addColumn('dob', 'date')
    .addColumn('bio', 'text')
    .$call(timestamps)
    .execute();

  await db.schema.createIndex('idx_user_name').on('users').columns(['firstName', 'lastName']).execute();
  await db.schema.createIndex('idx_user_email').on('users').column('email').execute();
  await db.schema.createIndex('idx_user_mobile').on('users').column('mobile').execute();

  await db.schema
    .createTable('operators')
    .$call(primaryKey)
    .addColumn('fullName', 'varchar(2048)', (col) => col.notNull())
    .addColumn('email', 'varchar(2048)', (col) => col.notNull())
    .addColumn('mobile', 'varchar(64)', (col) => col.notNull())
    .addColumn('homePhone', 'varchar(64)', (col) => col.notNull())
    .addColumn('address', 'text')
    .addColumn('dob', 'date')
    .addColumn('bio', 'text')
    .$call(timestamps)
    .execute();

  await db.schema.createIndex('idx_ops_name').on('operators').column('fullName').execute();
  await db.schema.createIndex('idx_ops_email').on('operators').column('email').execute();
  await db.schema.createIndex('idx_ops_mobile').on('operators').column('mobile').execute();

  await db.schema
    .createTable('managers')
    .$call(primaryKey)
    .addColumn('fullName', 'varchar(2048)', (col) => col.notNull())
    .addColumn('email', 'varchar(2048)', (col) => col.notNull())
    .addColumn('mobile', 'varchar(64)', (col) => col.notNull())
    .addColumn('homePhone', 'varchar(64)', (col) => col.notNull())
    .addColumn('address', 'text')
    .addColumn('dob', 'date')
    .addColumn('bio', 'text')
    .$call(timestamps)
    .execute();

  await db.schema.createIndex('idx_manager_name').on('managers').column('fullName').execute();
  await db.schema.createIndex('idx_manager_email').on('managers').column('email').execute();
  await db.schema.createIndex('idx_manager_mobiles').on('managers').column('mobile').execute();

  await db.schema
    .createTable('entities')
    .$call(primaryKey)
    .addColumn('tenantId', 'uuid', (col) => col.references('tenants.id').onDelete('cascade').notNull())
    .addColumn('actorType', 'varchar(128)', (col) => col.notNull())
    .addColumn('actorId', 'uuid', (col) => col.notNull())
    .addColumn('isActive', 'boolean', (col) => col.defaultTo(true))
    .$call(softDelete)
    .$call(timestamps)
    .addCheckConstraint('chk_entities_actor_type', oneOf('actorType', ['user', 'operator', 'manager']))
    .addUniqueConstraint('uniq_tenant_actor', ['tenantId', 'actorType', 'actorId'])
    .execute();

  await db.schema.createIndex('idx_entities_actor').on('entities').columns(['actorType', 'actorId']).execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('entities').ifExists().execute();
  await db.schema.dropTable('managers').ifExists().execute();
  await db.schema.dropTable('operators').ifExists().execute();
  await db.schema.dropTable('users').ifExists().execute();
}
