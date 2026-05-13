'use strict';

import { QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  await queryInterface.sequelize.transaction(async (transaction) => {
    // Migration logic for creating table, adding columns, etc. goes here.
  });
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.sequelize.transaction(async (transaction) => {
    // Logic to revert the migration goes here, such as dropping tables, removing columns, etc.
  });
};
