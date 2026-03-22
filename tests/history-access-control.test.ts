import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { generateRoomVisualizationForUser } from '../lib/server/services/generation-service.ts';

const projectRoot = process.cwd();

test('history route no longer exposes a public POST write path', async () => {
  const source = await readFile(path.join(projectRoot, 'app/api/history/route.ts'), 'utf8');

  assert.equal(
    /export\s+async\s+function\s+POST/.test(source),
    false,
    'app/api/history/route.ts should not keep a public POST writer'
  );

  assert.equal(
    source.includes('createHistoryItem'),
    false,
    'app/api/history/route.ts should not write history records directly'
  );
});

test('generation service is the only history write entrypoint', async () => {
  const calls = {
    createHistoryItem: 0,
  };

  const item = await generateRoomVisualizationForUser(
    {
      id: 'user-1',
      role: 'user',
      vipExpiresAt: null,
    },
        {
          roomImageId: 'room-1',
          historyItemId: null,
          furnitureItemIds: ['furniture-1'],
          customInstruction: '保留原有采光',
        },
    {
      async getGenerationCount() {
        return 0;
      },
      async getOwnedRoomImage() {
        return {
          id: 'room-1',
          name: '客厅',
          storagePath: 'room/path.png',
          mimeType: 'image/png',
          fileSize: 1024,
          aspectRatio: '4:3',
        };
      },
      async getHistoryRoomSnapshot() {
        return null;
      },
      async getOwnedFurnitureItems() {
        return [
          {
            id: 'furniture-1',
            name: '沙发',
            category: '沙发',
            storagePath: 'furniture/1.png',
            mimeType: 'image/png',
          },
        ];
      },
      async generateVisualization() {
        return 'data:image/png;base64,generated';
      },
      async createHistoryItem() {
        calls.createHistoryItem += 1;
        return {
          id: 'history-1',
        };
      },
    }
  );

  assert.deepEqual(item, { id: 'history-1' });
  assert.equal(calls.createHistoryItem, 1);
});
