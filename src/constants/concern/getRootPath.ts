import path from 'path';
import fs from 'fs';

export const getRootPath = (startDir: string, marker: string): string => {
  let currentDir = path.resolve(startDir);

  while (true) {
    const markerPath = path.join(currentDir, marker);

    // If the marker file exists, we found the target directory
    if (fs.existsSync(markerPath)) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      // We have reached the root directory and didn't find the marker file
      throw new Error(`Marker file "${marker}" not found in any parent directory of "${startDir}".`);
    }

    currentDir = parentDir;
  }
}