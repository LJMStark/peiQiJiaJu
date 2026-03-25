import assert from 'node:assert/strict';
import test from 'node:test';

import { createEmptyRoomEditorWorkspaceState } from '../lib/room-editor-workspace-state.ts';

test('createEmptyRoomEditorWorkspaceState clears the current workspace without touching history-facing state', () => {
  assert.deepEqual(createEmptyRoomEditorWorkspaceState(), {
    roomImages: [],
    pendingRoomImage: null,
    activeRoomId: null,
    selectedFurnitures: [],
    customInstruction: '',
    currentGeneratedImage: null,
    placedFurnitures: [],
    generationSessionId: null,
    currentResultIndex: 0,
    error: null,
    errorDetails: [],
  });
});
