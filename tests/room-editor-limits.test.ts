import assert from 'node:assert/strict';
import test from 'node:test';

import { MAX_SELECTED_FURNITURES } from '../lib/room-editor-limits.ts';

test('MAX_SELECTED_FURNITURES is three for room editor selection flow', () => {
  assert.equal(MAX_SELECTED_FURNITURES, 3);
});
