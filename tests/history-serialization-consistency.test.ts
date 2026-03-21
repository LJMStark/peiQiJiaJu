import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const projectRoot = process.cwd();

test('history listing fails fast instead of silently dropping serialization failures', async () => {
  const source = await readFile(path.join(projectRoot, 'lib/server/assets.ts'), 'utf8');

  assert.equal(
    source.includes('Promise.allSettled'),
    false,
    'listHistoryItems should not use Promise.allSettled for row serialization'
  );

  assert.equal(
    source.includes('collectSettledResults'),
    false,
    'listHistoryItems should not silently discard failed history rows'
  );
});
