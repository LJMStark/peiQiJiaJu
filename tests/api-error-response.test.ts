import assert from 'node:assert/strict';
import test from 'node:test';

import {
  badRequestSpec,
  createErrorEnvelope,
  errorResponseSpec,
  forbiddenSpec,
  unauthorizedSpec,
} from '../lib/server/http/error-envelope.ts';

test('createErrorEnvelope returns a stable code and message pair', () => {
  assert.deepEqual(
    createErrorEnvelope('INVALID_JSON', '请求体格式不正确。'),
    {
      code: 'INVALID_JSON',
      message: '请求体格式不正确。',
      error: '请求体格式不正确。',
    }
  );
});

test('errorResponse sanitizes internal errors', async () => {
  const response = errorResponseSpec(
    new Error('database password leaked'),
    '加载失败，请稍后重试。',
    500
  );

  assert.equal(response.status, 500);
  assert.deepEqual(response.body, {
    code: 'INTERNAL_SERVER_ERROR',
    message: '加载失败，请稍后重试。',
    error: '加载失败，请稍后重试。',
  });
});

test('badRequest keeps validation responses in the shared envelope', () => {
  const response = badRequestSpec('请求体格式不正确。', 'INVALID_JSON');

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, {
    code: 'INVALID_JSON',
    message: '请求体格式不正确。',
    error: '请求体格式不正确。',
  });
});

test('unauthorized and forbidden responses share the same envelope shape', () => {
  const unauthorizedResponse = unauthorizedSpec('请先登录后再继续。');
  const forbiddenResponse = forbiddenSpec('请先完成邮箱验证后再继续。');

  assert.equal(unauthorizedResponse.status, 401);
  assert.equal(forbiddenResponse.status, 403);

  assert.deepEqual(unauthorizedResponse.body, {
    code: 'UNAUTHORIZED',
    message: '请先登录后再继续。',
    error: '请先登录后再继续。',
  });

  assert.deepEqual(forbiddenResponse.body, {
    code: 'FORBIDDEN',
    message: '请先完成邮箱验证后再继续。',
    error: '请先完成邮箱验证后再继续。',
  });
});
