import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldIgnorePgPoolError } from '../lib/db-error.ts';

test('shouldIgnorePgPoolError only ignores the known Supabase SSL record error', () => {
  assert.equal(
    shouldIgnorePgPoolError({
      code: 'ERR_SSL_DECRYPTION_FAILED_OR_BAD_RECORD_MAC',
      message: 'decryption failed or bad record mac',
    }),
    true
  );

  assert.equal(
    shouldIgnorePgPoolError({
      code: 'ECONNRESET',
      message: 'socket hang up',
    }),
    false
  );
});
