import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_HISTORY_PAGE_SIZE,
  MAX_HISTORY_PAGE_SIZE,
  decodeHistoryCursor,
  encodeHistoryCursor,
  parseHistoryPageSize,
} from '../lib/server/history-pagination.ts';

test('history cursors round-trip a stable created_at and id pair', () => {
  const cursor = encodeHistoryCursor({
    createdAt: '2026-03-21T10:15:30.000Z',
    id: 'history-1',
  });

  assert.deepEqual(decodeHistoryCursor(cursor), {
    createdAt: '2026-03-21T10:15:30.000Z',
    id: 'history-1',
  });
});

test('history cursor decoding rejects malformed payloads', () => {
  assert.equal(decodeHistoryCursor(null), null);
  assert.throws(() => decodeHistoryCursor('not-base64-json'), /INVALID_HISTORY_CURSOR/);
  assert.throws(
    () => decodeHistoryCursor(Buffer.from(JSON.stringify({ createdAt: 'bad-date', id: 'history-1' })).toString('base64url')),
    /INVALID_HISTORY_CURSOR/
  );
});

test('history page size defaults, clamps, and rejects invalid values', () => {
  assert.equal(parseHistoryPageSize(null), DEFAULT_HISTORY_PAGE_SIZE);
  assert.equal(parseHistoryPageSize('6'), 6);
  assert.equal(parseHistoryPageSize(String(MAX_HISTORY_PAGE_SIZE + 10)), MAX_HISTORY_PAGE_SIZE);
  assert.throws(() => parseHistoryPageSize('0'), /INVALID_HISTORY_LIMIT/);
  assert.throws(() => parseHistoryPageSize('1.5'), /INVALID_HISTORY_LIMIT/);
});
