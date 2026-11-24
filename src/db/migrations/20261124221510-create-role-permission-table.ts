import type { Kysely } from 'kysely';
import { primaryKey, timestamps } from 'src/db/migration-blueprint';

// Kysely<any>: migrations run against whatever schema exists at this point in history.
// Column conventions (primaryKey, timestamps, softDelete, oneOf, nonNegative): src/db/migration-blueprint.ts
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.createTable('roles').ifNotExists()
    .$call(primaryKey)
    .addColumn('tenantId', 'uuid', (col) => col.references('tenants.id').onDelete('cascade'))
    .addColumn('name', 'varchar(2048)', (col) => col.notNull())
    .addColumn('code', 'varchar(1024)', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('isSystem', 'boolean', (col) => col.defaultTo(false))
    .addUniqueConstraint('uniq_roles_tenant_code', ['tenantId', 'code'])
    .addUniqueConstraint('uniq_roles_tenant_name', ['tenantId', 'name'])
    .$call(timestamps)
    .execute();

  await db.schema.createIndex('idx_roles_tenant_name')
    .on('roles')
    .columns(['tenantId', 'name'])
    .execute();

  await db.schema.createIndex('idx_roles_tenant_code')
    .on('roles')
    .columns(['tenantId', 'code'])
    .execute();

  await db.schema.createTable('permissions').ifNotExists()
    .$call(primaryKey)
    .addColumn('name', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('code', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('resource', 'varchar(255)', (col) => col.notNull())
    .addColumn('action', 'varchar(255)', (col) => col.notNull())
    .addColumn('description', 'text')
    .$call(timestamps)
    .addUniqueConstraint('uniq_perm_resource_action', ['resource', 'action'])
    .execute();

  await db.schema.createIndex('idx_perm_resource')
    .on('permissions')
    .column('resource')
    .execute();

  await db.schema.createTable('role_permissions')
    .$call(primaryKey)
    .addColumn('roleId', 'uuid', (col) => col.notNull())
    .addColumn('permissionId', 'uuid', (col) => col.notNull())
    .$call(timestamps)
    .addUniqueConstraint('uniq_role_perm', ['roleId', 'permissionId'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('permissions').execute();
  await db.schema.dropTable('roles').execute();
}
