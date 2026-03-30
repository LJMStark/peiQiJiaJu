import assert from 'node:assert/strict';
import test from 'node:test';

import { loadRoomEditorBootstrapState } from '../lib/room-editor-bootstrap.ts';

const room = {
  id: 'room-1',
  name: 'Room 1',
  storagePath: 'room/1.webp',
  imageUrl: 'https://example.com/room-1.webp',
  mimeType: 'image/webp',
  fileSize: 123,
  createdAt: '2026-03-21T00:00:00.000Z',
};

const latestRoom = {
  ...room,
  id: 'room-2',
  name: 'Room 2',
  storagePath: 'room/2.webp',
  imageUrl: 'https://example.com/room-2.webp',
  createdAt: '2026-03-22T00:00:00.000Z',
};

const historyItem = {
  id: 'history-1',
  roomImage: room,
  furniture: {
    id: 'furniture-1',
    name: 'Sofa',
    category: '沙发',
    storagePath: 'furniture/1.webp',
    imageUrl: 'https://example.com/furniture-1.webp',
    mimeType: 'image/webp',
    fileSize: 456,
    createdAt: '2026-03-21T00:00:00.000Z',
  },
  furnitures: [
    {
      id: 'furniture-1',
      name: 'Sofa',
      category: '沙发',
      storagePath: 'furniture/1.webp',
      imageUrl: 'https://example.com/furniture-1.webp',
      mimeType: 'image/webp',
      fileSize: 456,
      createdAt: '2026-03-21T00:00:00.000Z',
    },
  ],
  generatedImage: {
    id: 'generated-1',
    name: 'Generated 1',
    storagePath: 'generated/1.webp',
    imageUrl: 'https://example.com/generated-1.webp',
    mimeType: 'image/webp',
    fileSize: 789,
    createdAt: '2026-03-21T00:00:00.000Z',
  },
  createdAt: '2026-03-21T00:00:00.000Z',
};

const historyPage = {
  items: [historyItem],
  hasMore: true,
  nextCursor: {
    createdAt: '2026-03-21T00:00:00.123456Z',
    id: historyItem.id,
  },
};

test('loadRoomEditorBootstrapState keeps rooms available when history loading fails', async () => {
  const state = await loadRoomEditorBootstrapState({
    loadRooms: async () => [room],
    loadHistory: async () => {
      throw new Error('Failed to create signed URL: Bad Gateway');
    },
  });

  assert.deepEqual(state.roomImages, []);
  assert.equal(state.activeRoomId, null);
  assert.equal(state.pendingRoomImage?.id, room.id);
  assert.deepEqual(state.history, []);
  assert.equal(state.historyNextCursor, null);
  assert.equal(state.error, '历史记录暂时加载失败，你仍可继续编辑当前房间。');
  assert.deepEqual(state.errorDetails, ['Failed to create signed URL: Bad Gateway']);
});

test('loadRoomEditorBootstrapState keeps the latest room pending instead of auto-selecting it', async () => {
  const state = await loadRoomEditorBootstrapState({
    loadRooms: async () => [room],
    loadHistory: async () => historyPage,
  });

  assert.deepEqual(state.roomImages, []);
  assert.equal(state.activeRoomId, null);
  assert.equal(state.pendingRoomImage?.id, room.id);
  assert.deepEqual(state.history, historyPage.items);
  assert.deepEqual(state.historyNextCursor, historyPage.nextCursor);
  assert.equal(state.error, null);
  assert.deepEqual(state.errorDetails, []);
});

test('loadRoomEditorBootstrapState chooses the latest room when the rooms API returns an older room first', async () => {
  const state = await loadRoomEditorBootstrapState({
    loadRooms: async () => [room, latestRoom],
    loadHistory: async () => historyPage,
  });

  assert.deepEqual(state.roomImages, []);
  assert.equal(state.activeRoomId, null);
  assert.equal(state.pendingRoomImage?.id, latestRoom.id);
  assert.deepEqual(state.history, historyPage.items);
  assert.deepEqual(state.historyNextCursor, historyPage.nextCursor);
  assert.equal(state.error, null);
  assert.deepEqual(state.errorDetails, []);
});

test('loadRoomEditorBootstrapState surfaces a blocking error when rooms fail to load', async () => {
  const state = await loadRoomEditorBootstrapState({
    loadRooms: async () => {
      throw new Error('rooms failed');
    },
    loadHistory: async () => historyPage,
  });

  assert.deepEqual(state.roomImages, []);
  assert.equal(state.activeRoomId, null);
  assert.equal(state.pendingRoomImage, null);
  assert.deepEqual(state.history, historyPage.items);
  assert.deepEqual(state.historyNextCursor, historyPage.nextCursor);
  assert.equal(state.error, '加载编辑器资源失败，请刷新页面重试。');
  assert.deepEqual(state.errorDetails, ['rooms failed']);
});
