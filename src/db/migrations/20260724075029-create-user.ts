import { DataTypes, QueryInterface } from 'sequelize';
import { TableBlueprint } from 'src/utils';

//temporary testing

export default {
  async up(queryInterface: QueryInterface): Promise<void> {
    await TableBlueprint.table('users')
      .column('name', DataTypes.STRING, { allowNull: false })
      .create(queryInterface);
  },

  async down(queryInterface: QueryInterface): Promise<void> {
    await TableBlueprint.dropTable(queryInterface, 'users');
  },
};
