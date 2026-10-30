import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { resolveRootDir } from 'src/utils/resolve-project-root';

describe('resolveRootDir', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'resolve-root-'));
  const nested = path.join(root, 'a', 'b');
  fs.mkdirSync(nested, { recursive: true });
  fs.writeFileSync(path.join(root, '.marker'), '');

  after(() => fs.rmSync(root, { recursive: true, force: true }));

  it('returns the start dir when it holds the marker', () => {
    assert.equal(resolveRootDir(root, '.marker'), root);
  });

  it('walks up to the nearest ancestor holding the marker', () => {
    assert.equal(resolveRootDir(nested, '.marker'), root);
  });

  it('throws when no ancestor holds the marker', () => {
    assert.throws(() => resolveRootDir(nested, `.missing-${process.pid}`), /not found in any parent directory/);
  });
});
