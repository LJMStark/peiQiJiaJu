import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldBypassImageOptimization } from '../lib/remote-images.ts';

test('shouldBypassImageOptimization disables optimization for Supabase signed asset URLs', () => {
  assert.equal(
    shouldBypassImageOptimization(
      'https://example.supabase.co/storage/v1/object/sign/furniture-assets/demo/file.jpg?token=abc123'
    ),
    true
  );
  assert.equal(
    shouldBypassImageOptimization('https://example.com/static/logo.png'),
    false
  );
  assert.equal(
    shouldBypassImageOptimization('/images/local-banner.png'),
    false
  );
});
