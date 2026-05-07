require('./setup'); // Ensure configuration is loaded before importing the app

// import { appLoaders } from './app';
import { appUtils } from './app';

(async () => {
  // await appLoaders.datasource.init();
  appUtils.logger.info('Server is starting...');
})().catch((error) => {
  console.error('Error during server initialization:', error);
  process.exit(1); // Exit with a non-zero code to indicate failure
});
