import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

async function source(path: string): Promise<string> {
  return readFile(new URL(path, root), 'utf8');
}

test('editor preparation uses one divided panel with mobile step summaries', async () => {
  const input = await source('components/room-editor/RoomEditorInputPanel.tsx');

  assert.match(input, /divide-y/);
  assert.match(input, /aria-expanded/);
  assert.match(input, /还需上传室内图/);
  assert.match(input, /还需选择家具/);
});

test('result actions live below the image and announce generated results', async () => {
  const result = await source('components/room-editor/RoomEditorResultPanel.tsx');

  assert.match(result, /aria-live="polite"/);
  assert.match(result, /更多操作/);
  assert.match(result, /currentSessionResults\.map/);
  assert.doesNotMatch(result, /absolute bottom-4/);
});

test('history defaults to four cards and expands on demand', async () => {
  const history = await source('components/room-editor/RoomEditorHistorySection.tsx');

  assert.match(history, /slice\(0, 4\)/);
  assert.match(history, /展开全部历史/);
  assert.match(history, /收起历史/);
});

test('furniture drawer is exposed as a labelled full-height dialog', async () => {
  const drawer = await source('components/room-editor/FurnitureDrawer.tsx');

  assert.match(drawer, /role="dialog"/);
  assert.match(drawer, /aria-modal="true"/);
  assert.match(drawer, /aria-label="关闭家具选择"/);
});
