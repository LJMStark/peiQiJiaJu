import assert from 'node:assert/strict';
import test from 'node:test';

import { RouteError } from '../lib/server/http/error-envelope.ts';
import {
  generateRoomVisualizationForUser,
  parseGenerateRequest,
} from '../lib/server/services/generation-service.ts';

function createGenerationDeps(overrides: Partial<Parameters<typeof generateRoomVisualizationForUser>[2]> = {}) {
  const calls = {
    getGenerationCount: 0,
    getOwnedRoomImage: 0,
    getHistoryRoomSnapshot: 0,
    getOwnedFurnitureItems: 0,
    generateVisualization: 0,
    createHistoryItem: 0,
  };

  const deps = {
    async getGenerationCount() {
      calls.getGenerationCount += 1;
      return 0;
    },
    async getOwnedRoomImage() {
      calls.getOwnedRoomImage += 1;
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
      calls.getHistoryRoomSnapshot += 1;
      return null;
    },
    async getOwnedFurnitureItems() {
      calls.getOwnedFurnitureItems += 1;
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
      calls.generateVisualization += 1;
      return 'data:image/png;base64,generated';
    },
    async createHistoryItem() {
      calls.createHistoryItem += 1;
      return { id: 'history-1' };
    },
    ...overrides,
  };

  return { calls, deps };
}

test('parseGenerateRequest rejects legacy furniture fallback storage pointers from the client', () => {
  assert.throws(
    () =>
      parseGenerateRequest({
        roomImageId: 'room-1',
        furnitureItemIds: ['furniture-1'],
        furnitureFallbacks: [
          {
            storagePath: 'private/furniture-1.png',
            mimeType: 'image/png',
          },
        ],
      }),
    (error) => {
      assert.ok(error instanceof RouteError);
      assert.equal(error.status, 400);
      assert.equal(error.code, 'UNSUPPORTED_FIELD');
      return true;
    }
  );
});

test('parseGenerateRequest accepts a history item id for restored room snapshots', () => {
  const input = parseGenerateRequest({
    roomImageId: 'history-1:room',
    historyItemId: 'history-1',
    furnitureItemIds: ['furniture-1'],
    customInstruction: '恢复历史房间',
  });

  assert.deepEqual(input, {
    roomImageId: 'history-1:room',
    historyItemId: 'history-1',
    furnitureItemIds: ['furniture-1'],
    customInstruction: '恢复历史房间',
  });
});

test('generateRoomVisualizationForUser rejects furniture outside the caller ownership scope', async () => {
  const { calls, deps } = createGenerationDeps({
    async getOwnedFurnitureItems() {
      calls.getOwnedFurnitureItems += 1;
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
  });

  await assert.rejects(
    () =>
      generateRoomVisualizationForUser(
        {
          id: 'user-1',
          role: 'user',
          vipExpiresAt: null,
        },
        {
          roomImageId: 'room-1',
          historyItemId: null,
          furnitureItemIds: ['furniture-1', 'furniture-2'],
          customInstruction: null,
        },
        deps
      ),
    (error) => {
      assert.ok(error instanceof RouteError);
      assert.equal(error.status, 404);
      assert.equal(error.code, 'FURNITURE_ITEM_NOT_FOUND');
      return true;
    }
  );

  assert.equal(calls.getOwnedRoomImage, 1);
  assert.equal(calls.getHistoryRoomSnapshot, 0);
  assert.equal(calls.getOwnedFurnitureItems, 1);
  assert.equal(calls.generateVisualization, 0);
  assert.equal(calls.createHistoryItem, 0);
});

test('generateRoomVisualizationForUser falls back to a restored history room snapshot when the original room was cleaned up', async () => {
  const { calls, deps } = createGenerationDeps({
    async getOwnedRoomImage() {
      calls.getOwnedRoomImage += 1;
      return null;
    },
    async getHistoryRoomSnapshot(userId, historyItemId, roomImageId) {
      calls.getHistoryRoomSnapshot += 1;
      assert.equal(userId, 'user-1');
      assert.equal(historyItemId, 'history-1');
      assert.equal(roomImageId, 'history-1:room');
      return {
        id: 'history-1:room',
        name: '历史客厅',
        storagePath: 'room/history-room.png',
        mimeType: 'image/png',
        fileSize: 2048,
        aspectRatio: '4:3',
      };
    },
    async createHistoryItem(_userId, input) {
      calls.createHistoryItem += 1;
      assert.equal(input.roomImageId, null);
      assert.deepEqual(input.roomFallback, {
        id: 'history-1:room',
        name: '历史客厅',
        storagePath: 'room/history-room.png',
        mimeType: 'image/png',
        fileSize: 2048,
        aspectRatio: '4:3',
      });
      return { id: 'history-2' };
    },
  });

  const item = await generateRoomVisualizationForUser(
    {
      id: 'user-1',
      role: 'user',
      vipExpiresAt: null,
    },
    {
      roomImageId: 'history-1:room',
      historyItemId: 'history-1',
      furnitureItemIds: ['furniture-1'],
      customInstruction: null,
    },
    deps
  );

  assert.deepEqual(item, { id: 'history-2' });
  assert.equal(calls.getOwnedRoomImage, 1);
  assert.equal(calls.getHistoryRoomSnapshot, 1);
  assert.equal(calls.getOwnedFurnitureItems, 1);
  assert.equal(calls.generateVisualization, 1);
  assert.equal(calls.createHistoryItem, 1);
});

test('generateRoomVisualizationForUser rejects mismatched history snapshot identifiers', async () => {
  const { calls, deps } = createGenerationDeps({
    async getOwnedRoomImage() {
      calls.getOwnedRoomImage += 1;
      return null;
    },
    async getHistoryRoomSnapshot() {
      calls.getHistoryRoomSnapshot += 1;
      return null;
    },
  });

  await assert.rejects(
    () =>
      generateRoomVisualizationForUser(
        {
          id: 'user-1',
          role: 'user',
          vipExpiresAt: null,
        },
        {
          roomImageId: 'history-1:room',
          historyItemId: 'history-2',
          furnitureItemIds: ['furniture-1'],
          customInstruction: null,
        },
        deps
      ),
    (error) => {
      assert.ok(error instanceof RouteError);
      assert.equal(error.status, 404);
      assert.equal(error.code, 'ROOM_IMAGE_NOT_FOUND');
      return true;
    }
  );

  assert.equal(calls.getOwnedRoomImage, 1);
  assert.equal(calls.getHistoryRoomSnapshot, 1);
  assert.equal(calls.getOwnedFurnitureItems, 0);
  assert.equal(calls.generateVisualization, 0);
  assert.equal(calls.createHistoryItem, 0);
});
