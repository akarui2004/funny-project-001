import path from 'path';
import { getRootPath } from "./concern";

const ROOT_DIR = getRootPath(__dirname, '.app_root');
const CONFIG_DIF = path.resolve(ROOT_DIR, 'config');
const SRC_DIR = path.resolve(ROOT_DIR, 'src');
const APP_DIR = path.resolve(SRC_DIR, 'app');

export const Defaults = {
  ROOT_DIR,
  CONFIG_DIF,
  SRC_DIR,
  APP_DIR
} as const
