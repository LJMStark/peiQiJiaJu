import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveHistoryRestoreRoomId } from '../lib/room-editor-history-state.ts';

test('resolveHistoryRestoreRoomId keeps the current room when the history room is no longer current', () => {
  const roomId = resolveHistoryRestoreRoomId({
    currentRooms: [
      {
        id: 'current-room',
        name: 'Current room',
        storagePath: 'room/current.webp',
        imageUrl: 'https://example.com/current.webp',
        mimeType: 'image/webp',
        fileSize: 123,
      },
    ],
    currentActiveRoomId: 'current-room',
    historyRoomId: 'history-room',
  });

  assert.equal(roomId, 'current-room');
});

test('resolveHistoryRestoreRoomId reuses the matching room when the history room is still current', () => {
  const roomId = resolveHistoryRestoreRoomId({
    currentRooms: [
      {
        id: 'room-a',
        name: 'Room A',
        storagePath: 'room/a.webp',
        imageUrl: 'https://example.com/a.webp',
        mimeType: 'image/webp',
        fileSize: 123,
      },
      {
        id: 'room-b',
        name: 'Room B',
        storagePath: 'room/b.webp',
        imageUrl: 'https://example.com/b.webp',
        mimeType: 'image/webp',
        fileSize: 456,
      },
    ],
    currentActiveRoomId: 'room-a',
    historyRoomId: 'room-b',
  });

  assert.equal(roomId, 'room-b');
});

test('resolveHistoryRestoreRoomId returns null when there is no current room', () => {
  const roomId = resolveHistoryRestoreRoomId({
    currentRooms: [],
    currentActiveRoomId: null,
    historyRoomId: 'history-room',
  });

  assert.equal(roomId, null);
});
