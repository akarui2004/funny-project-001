import { sql, type Kysely } from 'kysely';
import { primaryKey, softDelete, timestamps } from 'src/db/migration-blueprint';

// Kysely<any>: migrations run against whatever schema exists at this point in history.
// Column conventions (primaryKey, timestamps, softDelete, oneOf, nonNegative): src/db/migration-blueprint.ts
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createType('tenant_status')
    .asEnum(['active', 'deactive', 'suspended'])
    .execute();

  await db.schema.createTable('tenants').ifNotExists()
    .$call(primaryKey)
    .addColumn('code', 'varchar(2048)', (col) => col.notNull().unique())
    .addColumn('name', 'varchar(1024)', (col) => col.notNull())
    .addColumn('status', sql`tenant_status`, (col) => col.defaultTo('active'))
    .$call(softDelete)
    .$call(timestamps)
    .execute();

  await db.schema
    .createIndex('idx_tenant_name')
    .on('tenants')
    .column('name')
    .execute();

  await db.schema
    .createIndex('idx_tenant_status')
    .on('tenants')
    .column('status')
    .execute();

  await db.schema.createTable('tenant_domains').ifNotExists()
    .$call(primaryKey)
    .addColumn('tenantId', 'uuid', (col) => col.references('tenants.id').onDelete('cascade').notNull())
    .addColumn('domain', 'varchar(1024)', (col) => col.notNull())
    .addColumn('isPrimary', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('isVerified', 'boolean', (col) => col.notNull().defaultTo(false))
    .addUniqueConstraint('uniq_domain_wtenant', ['tenantId', 'domain'])
    .$call(softDelete)
    .$call(timestamps)
    .execute();

  await db.schema
    .createIndex('idx_tenant_domains_tenantId')
    .on('tenant_domains')
    .column('tenantId')
    .execute();

  await db.schema
    .createIndex('idx_tenant_domain')
    .on('tenant_domains')
    .column('domain')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('tenant_domains').execute();
  await db.schema.dropTable('tenants').execute();
  await db.schema.dropType('tenant_status').execute();
}
