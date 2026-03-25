import assert from 'node:assert/strict';
import test from 'node:test';

import { getRoomIdToDeleteForNewProject } from '../lib/room-editor-project-state.ts';

const currentRoom = {
  id: 'room-current',
  name: 'Current room',
  storagePath: 'room/current.webp',
  imageUrl: 'https://example.com/current.webp',
  mimeType: 'image/webp',
  fileSize: 100,
  createdAt: '2026-03-25T00:00:00.000Z',
};

const restoredHistoryRoom = {
  id: 'history-1:room',
  name: 'History room',
  storagePath: 'room/history.webp',
  imageUrl: 'https://example.com/history.webp',
  mimeType: 'image/webp',
  fileSize: 80,
  createdAt: '2026-03-24T00:00:00.000Z',
  restoreHistoryItemId: 'history-1',
};

test('getRoomIdToDeleteForNewProject prefers the pending room when one exists', () => {
  assert.equal(
    getRoomIdToDeleteForNewProject({
      roomImages: [restoredHistoryRoom],
      pendingRoomImage: currentRoom,
    }),
    'room-current'
  );
});

test('getRoomIdToDeleteForNewProject returns the persisted room in the workspace', () => {
  assert.equal(
    getRoomIdToDeleteForNewProject({
      roomImages: [restoredHistoryRoom, currentRoom],
      pendingRoomImage: null,
    }),
    'room-current'
  );
});

test('getRoomIdToDeleteForNewProject returns null when only restored history rooms remain', () => {
  assert.equal(
    getRoomIdToDeleteForNewProject({
      roomImages: [restoredHistoryRoom],
      pendingRoomImage: null,
    }),
    null
  );
});

test('getRoomIdToDeleteForNewProject keeps using the real room id when history restore reused it', () => {
  assert.equal(
    getRoomIdToDeleteForNewProject({
      roomImages: [currentRoom],
      pendingRoomImage: null,
    }),
    'room-current'
  );
});
