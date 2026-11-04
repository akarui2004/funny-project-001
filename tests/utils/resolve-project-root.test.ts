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

  it('when the start dir holds the marker, returns it', () => {
    assert.equal(resolveRootDir(root, '.marker'), root);
  });

  it('when only an ancestor holds the marker, walks up to the nearest one', () => {
    assert.equal(resolveRootDir(nested, '.marker'), root);
  });

  it('when no ancestor holds the marker, throws', () => {
    assert.throws(() => resolveRootDir(nested, `.missing-${process.pid}`), /not found in any parent directory/);
  });
});
