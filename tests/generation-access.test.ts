import assert from 'node:assert/strict';
import test from 'node:test';

import { FREE_GENERATION_LIMIT, getGenerationAccessState } from '../lib/generation-access.ts';
import { RouteError } from '../lib/server/http/error-envelope.ts';
import { generateRoomVisualizationForUser } from '../lib/server/services/generation-service.ts';

test('getGenerationAccessState allows admins to generate even after the free limit', () => {
  const access = getGenerationAccessState({
    role: 'admin',
    vipExpiresAt: null,
    generationCount: FREE_GENERATION_LIMIT,
    now: new Date('2026-03-21T12:00:00.000Z'),
  });

  assert.equal(access.isAdmin, true);
  assert.equal(access.vipExpired, false);
  assert.equal(access.freeLimitReached, false);
  assert.equal(access.canGenerate, true);
});

test('getGenerationAccessState blocks expired non-admin memberships', () => {
  const access = getGenerationAccessState({
    role: 'user',
    vipExpiresAt: '2026-03-20T12:00:00.000Z',
    generationCount: 0,
    now: new Date('2026-03-21T12:00:00.000Z'),
  });

  assert.equal(access.isAdmin, false);
  assert.equal(access.isVip, false);
  assert.equal(access.vipExpired, true);
  assert.equal(access.canGenerate, true);
});

test('getGenerationAccessState enforces the free limit for regular users', () => {
  const access = getGenerationAccessState({
    role: 'user',
    vipExpiresAt: null,
    generationCount: FREE_GENERATION_LIMIT,
    now: new Date('2026-03-21T12:00:00.000Z'),
  });

  assert.equal(access.freeLimitReached, true);
  assert.equal(access.canGenerate, false);
});

function createGenerationDepsWithCallCounters(generationCount: number) {
  const calls = {
    getGenerationCount: 0,
    getOwnedRoomImage: 0,
    getHistoryRoomSnapshot: 0,
    getOwnedFurnitureItems: 0,
    generateVisualization: 0,
    createHistoryItem: 0,
  };

  return {
    calls,
    deps: {
      async getGenerationCount() {
        calls.getGenerationCount += 1;
        return generationCount;
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
    },
  };
}

test('generateRoomVisualizationForUser blocks expired memberships before loading any assets', async () => {
  const { calls, deps } = createGenerationDepsWithCallCounters(0);

  await assert.rejects(
    () =>
      generateRoomVisualizationForUser(
        {
          id: 'user-1',
          role: 'user',
          vipExpiresAt: '2026-03-20T12:00:00.000Z',
        },
        {
          roomImageId: 'room-1',
          historyItemId: null,
          furnitureItemIds: ['furniture-1'],
          customInstruction: null,
        },
        deps
      ),
    (error) => {
      assert.ok(error instanceof RouteError);
      assert.equal(error.status, 403);
      assert.equal(error.code, 'VIP_EXPIRED');
      return true;
    }
  );

  assert.equal(calls.getGenerationCount, 1);
  assert.equal(calls.getOwnedRoomImage, 0);
  assert.equal(calls.getOwnedFurnitureItems, 0);
  assert.equal(calls.generateVisualization, 0);
  assert.equal(calls.createHistoryItem, 0);
});

test('generateRoomVisualizationForUser blocks free-limit users before loading any assets', async () => {
  const { calls, deps } = createGenerationDepsWithCallCounters(FREE_GENERATION_LIMIT);

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
          furnitureItemIds: ['furniture-1'],
          customInstruction: null,
        },
        deps
      ),
    (error) => {
      assert.ok(error instanceof RouteError);
      assert.equal(error.status, 403);
      assert.equal(error.code, 'FREE_LIMIT_REACHED');
      return true;
    }
  );

  assert.equal(calls.getGenerationCount, 1);
  assert.equal(calls.getOwnedRoomImage, 0);
  assert.equal(calls.getOwnedFurnitureItems, 0);
  assert.equal(calls.generateVisualization, 0);
  assert.equal(calls.createHistoryItem, 0);
});
