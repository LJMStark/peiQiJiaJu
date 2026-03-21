import assert from 'node:assert/strict';
import test from 'node:test';

import { createRoomImageCleanupPlan } from '../lib/room-image-policy.ts';

test('createRoomImageCleanupPlan keeps the selected current room and only deletes orphaned storage', () => {
  const plan = createRoomImageCleanupPlan(
    [
      { id: 'latest-room', storagePath: 'room/latest.webp', historyReferenceCount: 0 },
      { id: 'old-room-with-history', storagePath: 'room/old-history.webp', historyReferenceCount: 3 },
      { id: 'old-room-no-history', storagePath: 'room/old-orphan.webp', historyReferenceCount: 0 },
    ],
    ['latest-room']
  );

  assert.deepEqual(plan.staleRoomIds, ['old-room-with-history', 'old-room-no-history']);
  assert.deepEqual(plan.staleStoragePathsToDelete, ['room/old-orphan.webp']);
});

test('createRoomImageCleanupPlan removes every previous room during replacement upload', () => {
  const plan = createRoomImageCleanupPlan(
    [
      { id: 'room-a', storagePath: 'room/a.webp', historyReferenceCount: 1 },
      { id: 'room-b', storagePath: 'room/b.webp', historyReferenceCount: 0 },
    ],
    []
  );

  assert.deepEqual(plan.staleRoomIds, ['room-a', 'room-b']);
  assert.deepEqual(plan.staleStoragePathsToDelete, ['room/b.webp']);
});
