import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatBeijingDate,
  formatBeijingDateTime,
  formatBeijingTime,
} from '../lib/beijing-time.ts';

test('formatBeijingDateTime always formats in Asia/Shanghai', () => {
  const value = '2026-03-20T16:30:00.000Z';

  assert.equal(formatBeijingDateTime(value), '2026-03-21 00:30');
});

test('formatBeijingDate returns a long Chinese date in Asia/Shanghai', () => {
  const value = '2026-03-20T16:30:00.000Z';

  assert.equal(formatBeijingDate(value), '2026年3月21日');
});

test('formatBeijingTime returns 24-hour time in Asia/Shanghai', () => {
  const value = '2026-03-20T16:30:00.000Z';

  assert.equal(formatBeijingTime(value), '00:30');
});
