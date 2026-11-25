import type { Kysely } from 'kysely';
import { primaryKey, timestamps } from 'src/db/migration-blueprint';

// Kysely<any>: migrations run against whatever schema exists at this point in history.
// Column conventions (primaryKey, timestamps, softDelete, oneOf, nonNegative): src/db/migration-blueprint.ts
export async function up(db: Kysely<any>): Promise<void> {
  // when createdBy and updatedBy is null, this mean the console has been run
  await db.schema
    .createTable('entity_roles')
    .$call(primaryKey)
    .addColumn('entityId', 'uuid', (col) => col.references('entities.id').onDelete('cascade').notNull())
    .addColumn('tenantId', 'uuid', (col) => col.references('tenants.id').onDelete('cascade').notNull())
    .addColumn('roleId', 'uuid', (col) => col.references('roles.id').onDelete('cascade').notNull())
    .addColumn('createdBy', 'uuid', (col) => col.references('entities.id'))
    .addColumn('updatedBy', 'uuid', (col) => col.references('entities.id'))
    .$call(timestamps)
    .addUniqueConstraint('uniq_entity_role', ['entityId', 'roleId'])
    .execute();

  await db.schema
    .createTable('entity_permissions')
    .$call(primaryKey)
    .addColumn('entityId', 'uuid', (col) => col.references('entities.id').onDelete('cascade').notNull())
    .addColumn('tenantId', 'uuid', (col) => col.references('tenants.id').onDelete('cascade').notNull())
    .addColumn('permissionId', 'uuid', (col) => col.references('permissions.id').onDelete('cascade').notNull())
    .addColumn('createdBy', 'uuid', (col) => col.references('entities.id'))
    .addColumn('updatedBy', 'uuid', (col) => col.references('entities.id'))
    .$call(timestamps)
    .addUniqueConstraint('uniq_entity_permission', ['entityId', 'permissionId'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('entity_permissions').execute();
  await db.schema.dropTable('entity_roles').execute();
}
