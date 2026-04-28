import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildHistorySnapshotRoomId,
  canUseHistoryRoomSnapshotForRequest,
} from '../lib/history-room-snapshot.ts';

test('buildHistorySnapshotRoomId uses a stable history-derived room id', () => {
  assert.equal(
    buildHistorySnapshotRoomId({
      historyItemId: 'history-1',
      roomImageId: 'current-room-1',
    }),
    'history-1:room'
  );

  assert.equal(
    buildHistorySnapshotRoomId({
      historyItemId: 'history-1',
      roomImageId: null,
    }),
    'history-1:room'
  );
});

test('canUseHistoryRoomSnapshotForRequest accepts the stable history room id', () => {
  assert.equal(
    canUseHistoryRoomSnapshotForRequest({
      historyItemId: 'history-1',
      storedRoomImageId: 'current-room-1',
      requestedRoomImageId: 'history-1:room',
    }),
    true
  );
});

test('canUseHistoryRoomSnapshotForRequest accepts an old client room id while the row still references it', () => {
  assert.equal(
    canUseHistoryRoomSnapshotForRequest({
      historyItemId: 'history-1',
      storedRoomImageId: 'current-room-1',
      requestedRoomImageId: 'current-room-1',
    }),
    true
  );
});

test('canUseHistoryRoomSnapshotForRequest rejects stale old-client ids after the room foreign key is cleared', () => {
  assert.equal(
    canUseHistoryRoomSnapshotForRequest({
      historyItemId: 'history-1',
      storedRoomImageId: null,
      requestedRoomImageId: 'current-room-1',
    }),
    false
  );
});

test('canUseHistoryRoomSnapshotForRequest rejects unrelated room ids when the stored room id is still available', () => {
  assert.equal(
    canUseHistoryRoomSnapshotForRequest({
      historyItemId: 'history-1',
      storedRoomImageId: 'current-room-1',
      requestedRoomImageId: 'other-room',
    }),
    false
  );
});
