// Sequelize CLI config, loaded through .sequelizerc (which registers ts-node + tsconfig-paths).
// Reuses the runtime config loader, so the CLI gets the same deep-merged, Zod-validated
// datasource and the same connection options (incl. ssl) as the app.
//
// Plain require/module.exports on purpose: sequelize-cli loads this file with import(), and Node's
// built-in type stripping then handles this file only. require() hands the imported modules to
// ts-node + tsconfig-paths, which resolve the `src/*` alias.
const { default: appConfig } = require('src/app/config');
const { NODE_ENV } = require('src/constants');
const { buildSequelizeOptions } = require('src/app/connections/database');

module.exports = {
  [NODE_ENV]: buildSequelizeOptions(appConfig.datasource.master),
};
