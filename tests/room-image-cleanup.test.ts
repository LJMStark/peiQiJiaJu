import assert from 'node:assert/strict';
import test from 'node:test';

import { runWithRoomCleanupRecovery } from '../lib/room-image-cleanup.ts';

test('runWithRoomCleanupRecovery returns the action result without cleaning on success', async () => {
  let cleanupCalls = 0;

  const result = await runWithRoomCleanupRecovery({
    action: async () => ['room-1'],
    storagePathsToDelete: ['room/stale.webp'],
    cleanup: async () => {
      cleanupCalls += 1;
    },
  });

  assert.deepEqual(result, ['room-1']);
  assert.equal(cleanupCalls, 0);
});

test('runWithRoomCleanupRecovery cleans stale storage paths when the action throws', async () => {
  const cleanupCalls: string[][] = [];
  const expectedError = new Error('signed url failed');

  await assert.rejects(
    () =>
      runWithRoomCleanupRecovery({
        action: async () => {
          throw expectedError;
        },
        storagePathsToDelete: ['room/stale-a.webp', 'room/stale-b.webp'],
        cleanup: async (storagePaths) => {
          cleanupCalls.push([...storagePaths]);
        },
      }),
    expectedError
  );

  assert.deepEqual(cleanupCalls, [['room/stale-a.webp', 'room/stale-b.webp']]);
});
