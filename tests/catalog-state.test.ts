import assert from 'node:assert/strict';
import test from 'node:test';

import type { FurnitureItem } from '../lib/dashboard-types.ts';
import { startCatalogDelete } from '../lib/catalog-state.ts';

function createFurnitureItem(id: string): FurnitureItem {
  return {
    id,
    name: `Furniture ${id}`,
    category: '其他',
    storagePath: `furniture/${id}.webp`,
    imageUrl: `https://example.com/${id}.webp`,
    mimeType: 'image/webp',
    fileSize: 1,
    createdAt: '2026-03-21T00:00:00.000Z',
  };
}

test('startCatalogDelete removes the requested item and marks it as pending', () => {
  const initialCatalog = [createFurnitureItem('a'), createFurnitureItem('b'), createFurnitureItem('c')];

  const result = startCatalogDelete(initialCatalog, null, 'b');

  assert.equal(result.didStart, true);
  assert.equal(result.deletingItemId, 'b');
  assert.deepEqual(
    result.nextCatalog.map((item) => item.id),
    ['a', 'c']
  );
});

test('startCatalogDelete ignores overlapping deletes while one is already pending', () => {
  const initialCatalog = [createFurnitureItem('a'), createFurnitureItem('b'), createFurnitureItem('c')];

  const result = startCatalogDelete(initialCatalog, 'b', 'c');

  assert.equal(result.didStart, false);
  assert.equal(result.deletingItemId, 'b');
  assert.deepEqual(
    result.nextCatalog.map((item) => item.id),
    ['a', 'b', 'c']
  );
});
