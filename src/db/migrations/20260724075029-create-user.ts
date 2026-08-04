import { QueryInterface } from 'sequelize';
import { MigrationUtils } from 'src/utils';

export default {
  async up(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.createTable('users', {
      id: MigrationUtils.primaryKey(),
      username: MigrationUtils.genericString(true),
      password: MigrationUtils.genericString(true),
      role: MigrationUtils.enumType(['admin', 'sub-admin', 'member', 'guest'], false, 'guest'),
      ...MigrationUtils.softDeleteColumns,
      ...MigrationUtils.timestampColumns
    });
  },

  async down(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.dropTable('users');
  },
};
