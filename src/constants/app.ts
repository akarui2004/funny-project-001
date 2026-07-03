import path from 'path';

const ROOT_DIR = process.cwd(); // Define the root directory so that we can use it to resolve paths relative to the project root

export default {
  ENV: process.env.NODE_ENV || 'development',
  ROOT_DIR,
  CONFIG_DIR: path.resolve(ROOT_DIR, process.env.CONFIG_DIR || 'config'),
  APP_DIR: path.resolve(ROOT_DIR, 'src')
} as const;
