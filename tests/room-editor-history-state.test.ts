import assert from 'node:assert/strict';
import test from 'node:test';

import { restoreHistoryRoomState } from '../lib/room-editor-history-state.ts';

test('restoreHistoryRoomState injects the history room snapshot when it is no longer current', () => {
  const nextState = restoreHistoryRoomState({
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
    historyItemId: 'history-1',
    historyRoom: {
      id: 'history-room',
      name: 'History room',
      storagePath: 'room/history.webp',
      imageUrl: 'https://example.com/history.webp',
      mimeType: 'image/webp',
      fileSize: 456,
    },
  });

  assert.equal(nextState.activeRoomId, 'history-room');
  assert.deepEqual(
    nextState.rooms.map((room) => ({
      id: room.id,
      restoreHistoryItemId: room.restoreHistoryItemId ?? null,
    })),
    [
      {
        id: 'history-room',
        restoreHistoryItemId: 'history-1',
      },
      {
        id: 'current-room',
        restoreHistoryItemId: null,
      },
    ]
  );
});

test('restoreHistoryRoomState reuses the matching current room without duplicating it', () => {
  const nextState = restoreHistoryRoomState({
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
    historyItemId: 'history-2',
    historyRoom: {
      id: 'room-b',
      name: 'Room B snapshot',
      storagePath: 'room/b-history.webp',
      imageUrl: 'https://example.com/b-history.webp',
      mimeType: 'image/webp',
      fileSize: 789,
    },
  });

  assert.equal(nextState.activeRoomId, 'room-b');
  assert.deepEqual(nextState.rooms.map((room) => room.id), ['room-a', 'room-b']);
});

test('restoreHistoryRoomState restores the history room even when there is no current room', () => {
  const nextState = restoreHistoryRoomState({
    currentRooms: [],
    historyItemId: 'history-3',
    historyRoom: {
      id: 'history-room',
      name: 'History room',
      storagePath: 'room/history.webp',
      imageUrl: 'https://example.com/history.webp',
      mimeType: 'image/webp',
      fileSize: 123,
    },
  });

  assert.equal(nextState.activeRoomId, 'history-room');
  assert.deepEqual(nextState.rooms.map((room) => room.id), ['history-room']);
});
