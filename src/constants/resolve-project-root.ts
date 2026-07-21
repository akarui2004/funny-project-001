import fs from 'fs';
import path from 'path';

// Resolve the project root by walking up from this file until we find the `.app_root` marker.
export const resolveRootDir = (startDir: string, marker: string): string => {
  let currentDir = path.resolve(startDir);

  while (true) {
    const markerPath = path.join(currentDir, marker);

    if (fs.existsSync(markerPath)) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      throw new Error(`Marker file "${marker}" not found in any parent directory of "${startDir}".`);
    }

    currentDir = parentDir;
  }
};
