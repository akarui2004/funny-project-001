import { Model, QueryInterface } from 'sequelize';
import { MigrationUtils } from 'src/utils';

export default {
  async up(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.createTable('users', {
      id: MigrationUtils.primaryKey(),
      subId: MigrationUtils.uuid(false),
      username: MigrationUtils.genericString(true),
      password: MigrationUtils.genericString(true),
      role: MigrationUtils.enumType(['admin', 'sub-admin', 'member', 'guest'], false, 'guest'),
      wallet: MigrationUtils.decimal(false, 36, 18),
      point: MigrationUtils.bigInteger(false),
      age: MigrationUtils.integer(false),
      bio: MigrationUtils.text(),
      totalDays: MigrationUtils.unsignedInteger(false),
      birthdate: MigrationUtils.date(false),
      personalIdentityRegisterdDate: MigrationUtils.datetime(false),
      info: MigrationUtils.jsonType(false),
      ...MigrationUtils.softDeleteColumns,
      ...MigrationUtils.timestampColumns
    });
  },

  async down(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.dropTable('users');
  },
};
