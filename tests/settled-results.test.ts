import assert from 'node:assert/strict';
import test from 'node:test';

import { collectSettledResults } from '../lib/settled-results.ts';

test('collectSettledResults keeps fulfilled values and rejected reasons separated', () => {
  const result = collectSettledResults<string>([
    { status: 'fulfilled', value: 'first' },
    { status: 'rejected', reason: new Error('boom') },
    { status: 'fulfilled', value: 'second' },
  ]);

  assert.deepEqual(result.values, ['first', 'second']);
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0]?.index, 1);
  assert.equal(result.errors[0]?.reason instanceof Error, true);
  assert.equal((result.errors[0]?.reason as Error).message, 'boom');
});
