/**
 * Class Table Blueprint
 *
 * A fluent, chainable builder for Sequelize migrations that removes the
 * boilerplate from `queryInterface.createTable(...)` calls. Designed to be
 * used inside Sequelize CLI migration files.
 *
 * Purpose:
 *   1. Auto-include the common columns every table needs (`createdAt`,
 *      `updatedAt`, `deletedAt`) so each migration does not have to repeat
 *      them. Opt out with `.withoutTimestamps()` / `.withoutSoftDelete()`,
 *      or rename the soft-delete column via `.softDelete('<name>')`.
 *   2. Make column creation read like a one-liner:
 *        `.column('<column_name>', <column_data_type>, <column_options>)`
 *   3. Assume `id` is the primary key by default, but allow swapping it for
 *      another column name (e.g. `uuid`, `sku`) via `.primaryKey(...)` or
 *      `.uuidPrimaryKey(...)`.
 *
 * Example:
 *   await TableBlueprint
 *     .table('users')
 *     .column('email', DataTypes.STRING, { allowNull: false, unique: true })
 *     .column('name',  DataTypes.STRING)
 *     .create(queryInterface);
 *
 * Fluent API:
 *   1. primaryKey(name, type?, options?)
 *      - Declares the table's primary key. Defaults to an auto-increment
 *        INTEGER `id`. If a different name is passed, the default `id`
 *        column is removed automatically.
 *   2. uuidPrimaryKey(name?)
 *      - Convenience helper for UUID primary keys (`DataTypes.UUID`,
 *        default `UUIDV4`).
 *   3. withoutPrimaryKey()
 *      - Drops the default `id` column (use when the PK is defined via a
 *        different name elsewhere, or the table has no surrogate key).
 *   4. withoutTimestamps()
 *      - Skips adding `createdAt` / `updatedAt`.
 *   5. withoutSoftDelete()
 *      - Skips adding the `deletedAt` soft-delete column.
 *   6. column(name, type, options?)
 *      - Adds a regular column.
 *   7. foreignKey(name, targetTable, targetKey?, type?, options?)
 *      - Adds a foreign key with `ON UPDATE CASCADE` / `ON DELETE CASCADE`
 *        defaults. Pass `options` to override (e.g. `onDelete: 'SET NULL'`).
 *   8. softDelete(columnName?)
 *      - Enables soft deletes by adding a `deletedAt` column (default name
 *        `deletedAt`). Enabled by default; pass a custom name to rename.
 *   9. index(fields, options?)
 *      - Registers an index to be created *after* `create(...)`. `fields`
 *        can be a single column name or an array. `options` are passed
 *        straight to `queryInterface.addIndex(...)` (e.g. `{ unique: true,
 *        name: 'idx_users_email' }`).
 *  10. create(queryInterface)
 *      - Compiles the final column map (timestamps + soft-delete column
 *        if enabled), runs `queryInterface.createTable(...)`, then creates
 *        every index registered via `.index(...)` in registration order.
 *
 * Tear-down:
 *   - drop(queryInterface)
 *      Drops the table built by this blueprint instance.
 *   - dropIndex(queryInterface, indexName)
 *      Removes a single index from the table built by this blueprint.
 *
 * Static helpers (no instance needed):
 *   - TableBlueprint.table('<name>')
 *      Entry point. Returns a fresh `TableBlueprint` for chaining.
 *   - TableBlueprint.dropTable(queryInterface, '<name>')
 *      Drops an arbitrary table by name without instantiating a blueprint.
 *   - TableBlueprint.removeIndex(queryInterface, '<table>', '<index>')
 *      Removes an arbitrary index without instantiating a blueprint.
 *
 * Example with index:
 *   await TableBlueprint
 *     .table('users')
 *     .column('email', DataTypes.STRING, { allowNull: false, unique: true })
 *     .index('email', { unique: true, name: 'idx_users_email' })
 *     .create(queryInterface);
 */

import { DataType, DataTypes, ModelAttributeColumnOptions, QueryInterface, QueryInterfaceIndexOptions } from 'sequelize';

interface IndexDefinitions {
  fields: string[],
  options?: QueryInterfaceIndexOptions;
}

export class TableBlueprint {
  private columns: Record<string, ModelAttributeColumnOptions> = {};
  private indexes: IndexDefinitions[] = [];
  private includeTimestamps: boolean = true;
  private includeSoftDelete: boolean = true;
  private softDeleteColumn = 'deletedAt';

  constructor(private tableName: string) {
    this.primaryKey('id', DataTypes.INTEGER, { autoIncrement: true });
  }

  public static table(tableName: string): TableBlueprint {
    return new TableBlueprint(tableName);
  }

  public static async dropTable(queryInterface: QueryInterface, tableName: string) {
    await queryInterface.dropTable(tableName);
  }

  public static async removeIndex(
    queryInterface: QueryInterface,
    tableName: string,
    indexName: string,
  ) {
    await queryInterface.removeIndex(tableName, indexName);
  }

  /**
   * Defines a custom primary key column.
   * If the name is different from 'id', the default 'id' column is automatically removed.
   */
  public primaryKey(
    name: string,
    type: DataType = DataTypes.INTEGER,
    options: Omit<ModelAttributeColumnOptions, 'type' | 'primaryKey'> = {}
  ) {
    if (name !== 'id' && this.columns['id']?.primaryKey) {
      // remove the primary key id when the primary key name different with id,
      // we can conside uuid, sku....
      delete this.columns['id'];
    }

    this.columns[name] = {
      type,
      primaryKey: true,
      ...options,
    };
    return this;
  }

  /**
   * Convenience helper for UUID primary keys.
   */
  public uuidPrimaryKey(name: string = 'id') {
    return this.primaryKey(name, DataTypes.UUID, {
      defaultValue: DataTypes.UUIDV4,
    });
  }

  public withoutPrimaryKey() {
    delete this.columns['id'];
    return this;
  }

  public withoutTimestamps() {
    this.includeTimestamps = false;
    return this;
  }

  public withoutSoftDelete() {
    this.includeSoftDelete = false;
    return this;
  }

  /**
   * Enables soft deletes (adds `deletedAt` column).
   */
  public softDelete(columnName: string = 'deletedAt') {
    this.includeSoftDelete = true;
    this.softDeleteColumn = columnName;
    return this;
  }

  /**
   * Adds a regular column to the table.
   */
  public column(
    name: string,
    type: DataType,
    options: Omit<ModelAttributeColumnOptions, 'type'> = {}
  ) {
    this.columns[name] = { type, ...options };
    return this;
  }

  /**
   * Helper for Foreign Keys with cascading defaults.
   */
  public foreignKey(
    name: string,
    targetTable: string,
    targetKey: string = 'id',
    type: DataType = DataTypes.INTEGER,
    options: Omit<ModelAttributeColumnOptions, 'type' | 'references'> = {}
  ) {
    this.columns[name] = {
      type,
      references: {
        model: targetTable,
        key: targetKey,
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      ...options,
    };

    return this;
  }

  /**
   * Registers an index to be automatically created right after table creation.
   */
  public index(fields: string | string[], options?: QueryInterfaceIndexOptions): this {
    const fieldArray = Array.isArray(fields) ? fields : [fields];
    this.indexes.push({ fields: fieldArray, options });
    return this;
  }

  /**
   * Compiles final schema and runs queryInterface.createTable()
   */
  public async create(queryInterface: QueryInterface): Promise<void> {
    const finalColumns = { ...this.columns };

    if (this.includeTimestamps) {
      finalColumns.createdAt = { type: DataTypes.DATE, allowNull: false };
      finalColumns.updatedAt = { type: DataTypes.DATE, allowNull: false };
    }

    if (this.includeSoftDelete) {
      finalColumns[this.softDeleteColumn] = { type: DataTypes.DATE, allowNull: true, defaultValue: null };
    }

    // 1. Create table
    await queryInterface.createTable(this.tableName, finalColumns);

    // 2. Attach indexes automatically
    for (const idx of this.indexes) {
      await queryInterface.addIndex(this.tableName, idx.fields, idx.options);
    }
  }

  /** Instance drop table execution */
  public async drop(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.dropTable(this.tableName);
  }

  /** Instance drop index execution */
  public async dropIndex(queryInterface: QueryInterface, indexName: string): Promise<void> {
    await queryInterface.removeIndex(this.tableName, indexName);
  }
}
