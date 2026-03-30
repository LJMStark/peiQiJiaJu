import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildHistoryPageSearchParams,
  parseHistoryPageOptions,
} from '../lib/history-page.ts';

test('parseHistoryPageOptions returns empty options when params are omitted', () => {
  assert.deepEqual(parseHistoryPageOptions(new URLSearchParams()), {
    limit: undefined,
    cursor: undefined,
    invalidCursor: false,
  });
});

test('parseHistoryPageOptions accepts valid microsecond cursors', () => {
  const options = parseHistoryPageOptions(new URLSearchParams({
    limit: '12',
    cursorCreatedAt: '2026-03-30T10:00:00.123456Z',
    cursorId: 'history-2',
  }));

  assert.deepEqual(options, {
    limit: 12,
    cursor: {
      createdAt: '2026-03-30T10:00:00.123456Z',
      id: 'history-2',
    },
    invalidCursor: false,
  });
});

test('parseHistoryPageOptions ignores incomplete cursor params', () => {
  assert.deepEqual(
    parseHistoryPageOptions(new URLSearchParams({
      cursorCreatedAt: '2026-03-30T10:00:00.123456Z',
    })),
    {
      limit: undefined,
      cursor: undefined,
      invalidCursor: false,
    }
  );
});

test('parseHistoryPageOptions rejects malformed cursor timestamps', () => {
  assert.deepEqual(
    parseHistoryPageOptions(new URLSearchParams({
      cursorCreatedAt: 'not-a-date',
      cursorId: 'history-2',
    })),
    {
      limit: undefined,
      cursor: undefined,
      invalidCursor: true,
    }
  );
});

test('parseHistoryPageOptions rejects impossible calendar dates', () => {
  assert.deepEqual(
    parseHistoryPageOptions(new URLSearchParams({
      cursorCreatedAt: '2026-02-31T10:00:00.123456Z',
      cursorId: 'history-2',
    })),
    {
      limit: undefined,
      cursor: undefined,
      invalidCursor: true,
    }
  );
});

test('buildHistoryPageSearchParams preserves microsecond cursor precision', () => {
  const searchParams = buildHistoryPageSearchParams({
    limit: 12,
    cursor: {
      createdAt: '2026-03-30T10:00:00.123456Z',
      id: 'history-2',
    },
  });

  assert.equal(searchParams.get('limit'), '12');
  assert.equal(searchParams.get('cursorCreatedAt'), '2026-03-30T10:00:00.123456Z');
  assert.equal(searchParams.get('cursorId'), 'history-2');
});
