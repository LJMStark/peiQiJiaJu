import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const projectRoot = process.cwd();

test('selected furniture area reopens the catalog instead of triggering a direct file upload', async () => {
  const source = await readFile(
    path.join(projectRoot, 'components/room-editor/RoomEditorInputPanel.tsx'),
    'utf8'
  );

  assert.equal(
    source.includes('onClick={() => setIsDrawerOpen(true)}'),
    true,
    'RoomEditorInputPanel should expose a catalog-opening action for adding more furniture'
  );

  assert.equal(
    source.includes('继续选择'),
    true,
    'RoomEditorInputPanel should label the second furniture entry as a catalog selection action'
  );

  assert.doesNotMatch(
    source,
    /htmlFor=\{furnitureUploadInputId\}[\s\S]{0,200}继续添加/,
    'RoomEditorInputPanel should not wire the second furniture entry directly to the hidden upload input'
  );
});
