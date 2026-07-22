import path from 'path';
import { resolveRootDir } from './resolve-project-root';

const ROOT_DIR = resolveRootDir(__dirname, '.app_root');
const CONFIG_DIR = path.resolve(ROOT_DIR, 'config');
const SRC_DIR = path.resolve(ROOT_DIR, 'src');
const APP_DIR = path.resolve(SRC_DIR, 'app');
const LOGS_DIR = path.resolve(ROOT_DIR, 'logs');

export const Defaults = {
  ROOT_DIR,
  CONFIG_DIR,
  SRC_DIR,
  APP_DIR,
  LOGS_DIR,
} as const
