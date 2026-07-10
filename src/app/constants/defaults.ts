import { getRootPath } from "./concern";
import path from 'path';

const ROOT_DIR = getRootPath(__dirname, '.app_root');
const SRC_DIR = path.resolve(ROOT_DIR, 'src');
const APP_DIR = path.resolve(SRC_DIR, 'app');

export const Defaults = {
  ROOT_DIR,
  SRC_DIR,
  APP_DIR
} as const
