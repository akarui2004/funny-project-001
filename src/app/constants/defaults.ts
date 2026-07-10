import { getRootPath } from "./concern";

const ROOT_DIR = getRootPath(__dirname, '.app_root');

export const Defaults = {
  ROOT_DIR
} as const
