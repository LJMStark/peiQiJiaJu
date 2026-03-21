import assert from 'node:assert/strict';
import test from 'node:test';

import { inferRoomAspectRatioFromDimensions } from '../lib/room-aspect-ratio.ts';

test('inferRoomAspectRatioFromDimensions matches the closest supported room ratio', () => {
  assert.equal(inferRoomAspectRatioFromDimensions({ width: 1600, height: 900 }), '16:9');
  assert.equal(inferRoomAspectRatioFromDimensions({ width: 900, height: 1600 }), '9:16');
  assert.equal(inferRoomAspectRatioFromDimensions({ width: 1200, height: 1000 }), '4:3');
});
