import assert from 'node:assert/strict';
import test from 'node:test';

import { RouteError } from '../lib/server/http/error-envelope.ts';
import { normalizeGeminiError } from '../lib/server/gemini-error.ts';

test('normalizeGeminiError maps unsupported region errors to a user-facing route error', () => {
  const error = Object.assign(
    new Error(
      '{"error":{"code":400,"message":"User location is not supported for the API use.","status":"FAILED_PRECONDITION"}}'
    ),
    { name: 'ApiError', status: 400 }
  );

  const normalized = normalizeGeminiError(error);

  assert.ok(normalized instanceof RouteError);
  assert.equal(normalized.status, 503);
  assert.equal(normalized.code, 'AI_REGION_UNSUPPORTED');
  assert.equal(
    normalized.message,
    '出错了，请重新生成。'
  );
});

test('normalizeGeminiError maps model lookup failures to a user-facing route error', () => {
  const error = Object.assign(
    new Error(
      '{"error":{"code":404,"message":"Requested entity was not found.","status":"NOT_FOUND"}}'
    ),
    { name: 'ApiError', status: 404 }
  );

  const normalized = normalizeGeminiError(error);

  assert.ok(normalized instanceof RouteError);
  assert.equal(normalized.status, 503);
  assert.equal(normalized.code, 'AI_MODEL_NOT_FOUND');
});

test('normalizeGeminiError maps quota failures to a rate-limited route error', () => {
  const error = Object.assign(new Error('Rate limit exceeded for this quota bucket.'), {
    name: 'ApiError',
    status: 429,
  });

  const normalized = normalizeGeminiError(error);

  assert.ok(normalized instanceof RouteError);
  assert.equal(normalized.status, 429);
  assert.equal(normalized.code, 'AI_RATE_LIMITED');
  assert.equal(normalized.message, '出错了，请重新生成。');
});

test('normalizeGeminiError returns null for unrelated errors', () => {
  const normalized = normalizeGeminiError(new Error('Failed to load source image: missing key'));

  assert.equal(normalized, null);
});
