import assert from 'node:assert/strict';
import test from 'node:test';

import { removeRoomFromState } from '../lib/room-editor-room-state.ts';

test('removeRoomFromState clears the active room when deleting the only room', () => {
  const nextState = removeRoomFromState({
    currentRooms: [
      {
        id: 'room-1',
        name: 'Room 1',
        storagePath: 'room/1.webp',
        imageUrl: 'https://example.com/room-1.webp',
        mimeType: 'image/webp',
        fileSize: 1,
        createdAt: '2026-03-21T00:00:00.000Z',
      },
    ],
    currentActiveRoomId: 'room-1',
    removedRoomId: 'room-1',
  });

  assert.deepEqual(nextState.rooms, []);
  assert.equal(nextState.activeRoomId, null);
});

test('removeRoomFromState keeps the current active room when deleting another room', () => {
  const nextState = removeRoomFromState({
    currentRooms: [
      {
        id: 'room-2',
        name: 'Room 2',
        storagePath: 'room/2.webp',
        imageUrl: 'https://example.com/room-2.webp',
        mimeType: 'image/webp',
        fileSize: 2,
        createdAt: '2026-03-21T00:00:00.000Z',
      },
      {
        id: 'room-1',
        name: 'Room 1',
        storagePath: 'room/1.webp',
        imageUrl: 'https://example.com/room-1.webp',
        mimeType: 'image/webp',
        fileSize: 1,
        createdAt: '2026-03-20T00:00:00.000Z',
      },
    ],
    currentActiveRoomId: 'room-2',
    removedRoomId: 'room-1',
  });

  assert.deepEqual(nextState.rooms.map((room) => room.id), ['room-2']);
  assert.equal(nextState.activeRoomId, 'room-2');
});
