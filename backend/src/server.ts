require('./setup'); // Ensure configuration is loaded before importing the app

import { appLoaders } from './app';

(async () => {
  require('./setup'); // Ensure configuration is loaded before importing the app
  // Authenticate datasource connection before starting the server
  await appLoaders.datasource.authenticate();
})().catch((error) => {
  console.error('Error during server initialization:', error);
  process.exit(1); // Exit with a non-zero code to indicate failure
});
