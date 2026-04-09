import assert from 'node:assert/strict';
import test from 'node:test';

import { RouteError } from '../lib/server/http/error-envelope.ts';
import {
  generateRoomVibeForUser,
  parseGenerateVibeRequest,
} from '../lib/server/services/vibe-generation-service.ts';

function createGenerationVibeDeps(
  overrides: Partial<Parameters<typeof generateRoomVibeForUser>[2]> = {}
) {
  const calls = {
    getGenerationCount: 0,
    getOwnedHistoryVibeSource: 0,
    generateVibe: 0,
    createHistoryItem: 0,
  };

  const deps = {
    async getGenerationCount() {
      calls.getGenerationCount += 1;
      return 0;
    },
    async getOwnedHistoryVibeSource() {
      calls.getOwnedHistoryVibeSource += 1;
      return {
        historyItemId: 'history-1',
        roomImageId: 'room-1',
        roomFallback: {
          name: '客厅',
          storagePath: 'room/history-room.png',
          mimeType: 'image/png',
          fileSize: 2048,
          aspectRatio: '4:3',
        },
        furnitureItemIds: ['furniture-1'],
        furnitureFallbacks: [
          {
            name: '双人沙发',
            storagePath: 'furniture/1.png',
            mimeType: 'image/png',
            fileSize: 1024,
            category: '沙发',
          },
        ],
        generatedImage: {
          storagePath: 'generated/1.png',
          mimeType: 'image/png',
          aspectRatio: '4:3',
        },
      };
    },
    async generateVibe() {
      calls.generateVibe += 1;
      return 'data:image/png;base64,enhanced';
    },
    async createHistoryItem() {
      calls.createHistoryItem += 1;
      return { id: 'history-2' };
    },
    ...overrides,
  };

  return { calls, deps };
}

test('parseGenerateVibeRequest requires history item id', () => {
  assert.throws(
    () => parseGenerateVibeRequest({}),
    (error) => {
      assert.ok(error instanceof RouteError);
      assert.equal(error.status, 400);
      assert.equal(error.code, 'INVALID_GENERATE_VIBE_REQUEST');
      return true;
    }
  );
});

test('generateRoomVibeForUser rejects inaccessible history items', async () => {
  const { calls, deps } = createGenerationVibeDeps({
    async getOwnedHistoryVibeSource() {
      calls.getOwnedHistoryVibeSource += 1;
      return null;
    },
  });

  await assert.rejects(
    () =>
      generateRoomVibeForUser(
        {
          id: 'user-1',
          role: 'user',
          vipExpiresAt: null,
        },
        {
          historyItemId: 'history-missing',
        },
        deps
      ),
    (error) => {
      assert.ok(error instanceof RouteError);
      assert.equal(error.status, 404);
      assert.equal(error.code, 'HISTORY_ITEM_NOT_FOUND');
      return true;
    }
  );

  assert.equal(calls.generateVibe, 0);
  assert.equal(calls.createHistoryItem, 0);
});

test('generateRoomVibeForUser writes an enhanced image into history', async () => {
  const { calls, deps } = createGenerationVibeDeps({
    async createHistoryItem(_userId, input) {
      calls.createHistoryItem += 1;
      assert.equal(input.roomImageId, 'room-1');
      assert.equal(input.generatedDataUrl, 'data:image/png;base64,enhanced');
      assert.equal(input.customInstruction, null);
      assert.deepEqual(input.furnitureItemIds, ['furniture-1']);
      return { id: 'history-2' };
    },
  });

  const item = await generateRoomVibeForUser(
    {
      id: 'user-1',
      role: 'user',
      vipExpiresAt: null,
    },
    {
      historyItemId: 'history-1',
    },
    deps
  );

  assert.deepEqual(item, { id: 'history-2' });
  assert.equal(calls.getGenerationCount, 1);
  assert.equal(calls.getOwnedHistoryVibeSource, 1);
  assert.equal(calls.generateVibe, 1);
  assert.equal(calls.createHistoryItem, 1);
});
