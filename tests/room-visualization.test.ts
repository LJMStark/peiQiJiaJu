import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildVisualizationPrompt,
  findDuplicateFurnitureGroups,
  normalizeHistoryFurnitureSnapshots,
  resolveHistoryFurnitureSelection,
} from '../lib/room-visualization.ts';

test('findDuplicateFurnitureGroups returns repeated categories with original order', () => {
  const groups = findDuplicateFurnitureGroups([
    { id: 'a', name: '奶油双人沙发', category: '沙发' },
    { id: 'b', name: '胡桃木餐椅', category: '椅子' },
    { id: 'c', name: 'L 型转角沙发', category: '沙发' },
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.category, '沙发');
  assert.deepEqual(
    groups[0]?.items.map((item) => ({ id: item.id, index: item.index, name: item.name })),
    [
      { id: 'a', index: 0, name: '奶油双人沙发' },
      { id: 'c', index: 2, name: 'L 型转角沙发' },
    ]
  );
});

test('buildVisualizationPrompt numbers every image and requires all furniture in one result', () => {
  const prompt = buildVisualizationPrompt(
    [
      { id: 'a', name: '奶油双人沙发', category: '沙发' },
      { id: 'b', name: '胡桃木餐椅', category: '椅子' },
    ],
    '第1件家具是双人沙发，第2件家具是餐椅。'
  );

  assert.match(prompt, /\[图片 1\]/);
  assert.match(prompt, /\[图片 2\]：第1件目标家具参考图/);
  assert.match(prompt, /\[图片 3\]：第2件目标家具参考图/);
  assert.match(prompt, /所有已选家具必须同时出现在同一张输出图中/);
  assert.match(prompt, /第1件家具是双人沙发，第2件家具是餐椅。/);
});

test('buildVisualizationPrompt supports three furniture references in order', () => {
  const prompt = buildVisualizationPrompt(
    [
      { id: 'a', name: '奶油双人沙发', category: '沙发' },
      { id: 'b', name: '胡桃木餐椅', category: '椅子' },
      { id: 'c', name: '中古落地灯', category: '灯具' },
    ],
    '第1件家具是双人沙发，第2件家具是餐椅，第3件家具是落地灯。'
  );

  assert.match(prompt, /\[图片 4\]：第3件目标家具参考图/);
  assert.match(prompt, /第1件家具是双人沙发，第2件家具是餐椅，第3件家具是落地灯。/);
  assert.match(prompt, /所有已选家具必须同时出现在同一张输出图中/);
});

test('normalizeHistoryFurnitureSnapshots prefers array snapshots when present', () => {
  const furnitures = normalizeHistoryFurnitureSnapshots({
    legacyFurniture: {
      id: 'legacy',
      name: '旧沙发',
      category: '沙发',
      storagePath: 'legacy-path',
      mimeType: 'image/png',
      fileSize: 123,
    },
    selectedFurnituresSnapshot: [
      {
        id: 'a',
        name: '奶油双人沙发',
        category: '沙发',
        storagePath: 'a-path',
        mimeType: 'image/png',
        fileSize: 456,
      },
      {
        id: 'b',
        name: '胡桃木餐椅',
        category: '椅子',
        storagePath: 'b-path',
        mimeType: 'image/webp',
        fileSize: 789,
      },
    ],
  });

  assert.equal(furnitures.length, 2);
  assert.deepEqual(
    furnitures.map((item) => ({ id: item.id, name: item.name, category: item.category })),
    [
      { id: 'a', name: '奶油双人沙发', category: '沙发' },
      { id: 'b', name: '胡桃木餐椅', category: '椅子' },
    ]
  );
});

test('normalizeHistoryFurnitureSnapshots falls back to the legacy furniture snapshot', () => {
  const furnitures = normalizeHistoryFurnitureSnapshots({
    legacyFurniture: {
      id: 'legacy',
      name: '旧沙发',
      category: '沙发',
      storagePath: 'legacy-path',
      mimeType: 'image/png',
      fileSize: 123,
    },
    selectedFurnituresSnapshot: null,
  });

  assert.deepEqual(furnitures, [
    {
      id: 'legacy',
      name: '旧沙发',
      category: '沙发',
      storagePath: 'legacy-path',
      mimeType: 'image/png',
      fileSize: 123,
    },
  ]);
});

test('resolveHistoryFurnitureSelection keeps legacy foreign key nullable for fallback-only furniture', () => {
  const selection = resolveHistoryFurnitureSelection({
    furnitureItemIds: ['deleted-furniture-id'],
    persistedFurnitures: [],
    furnitureFallbacks: [
      {
        name: '奶油双人沙发',
        storagePath: 'fallback-path',
        mimeType: 'image/png',
        fileSize: 456,
        category: '沙发',
      },
    ],
  });

  assert.equal(selection?.primaryHistoryFurnitureId, null);
  assert.deepEqual(selection?.snapshots, [
    {
      id: 'deleted-furniture-id',
      name: '奶油双人沙发',
      category: '沙发',
      storagePath: 'fallback-path',
      mimeType: 'image/png',
      fileSize: 456,
    },
  ]);
});
