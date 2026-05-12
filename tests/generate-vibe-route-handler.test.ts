import assert from 'node:assert/strict';
import test from 'node:test';

import { createRouteError, errorResponseSpec } from '../lib/server/http/error-envelope.ts';
import { createGenerateVibeRouteHandler } from '../lib/server/generate-vibe-route-handler.ts';

function createAuthorizedSessionResult() {
  return {
    response: null,
    session: {
      user: {
        id: 'user-1',
        role: 'user',
        vipExpiresAt: null,
      },
    },
  };
}

test('generate vibe route returns 404 when history item cannot be accessed', async () => {
  const handler = createGenerateVibeRouteHandler({
    async requireVerifiedRequestSession() {
      return createAuthorizedSessionResult();
    },
    async parseJsonObject() {
      return {};
    },
    parseGenerateVibeRequest() {
      return {
        historyItemId: 'history-missing',
      };
    },
    async generateRoomVibeForUserWithDefaults() {
      throw createRouteError({
        status: 404,
        code: 'HISTORY_ITEM_NOT_FOUND',
        message: 'History item not found.',
      });
    },
    errorResponse(error, fallbackMessage, status) {
      const spec = errorResponseSpec(error, fallbackMessage, status);
      return Response.json(spec.body, { status: spec.status });
    },
  });

  const response = await handler(new Request('http://localhost/api/generate-vibe', {
    method: 'POST',
    body: '{}',
    headers: { 'content-type': 'application/json' },
  }));
  const payload = await response.json();

  assert.equal(response.status, 404);
  assert.deepEqual(payload, {
    code: 'HISTORY_ITEM_NOT_FOUND',
    message: 'History item not found.',
    error: 'History item not found.',
  });
});

test('generate vibe route returns 429 when generation capacity is exhausted', async () => {
  const handler = createGenerateVibeRouteHandler({
    async requireVerifiedRequestSession() {
      return createAuthorizedSessionResult();
    },
    async parseJsonObject() {
      return {};
    },
    parseGenerateVibeRequest() {
      return {
        historyItemId: 'history-1',
      };
    },
    async generateRoomVibeForUserWithDefaults() {
      throw createRouteError({
        status: 429,
        code: 'GENERATION_CAPACITY_REACHED',
        message: '当前生成请求较多，请稍后再试。',
      });
    },
    errorResponse(error, fallbackMessage, status) {
      const spec = errorResponseSpec(error, fallbackMessage, status);
      return Response.json(spec.body, { status: spec.status });
    },
  });

  const response = await handler(new Request('http://localhost/api/generate-vibe', {
    method: 'POST',
    body: '{}',
    headers: { 'content-type': 'application/json' },
  }));
  const payload = await response.json();

  assert.equal(response.status, 429);
  assert.deepEqual(payload, {
    code: 'GENERATION_CAPACITY_REACHED',
    message: '当前生成请求较多，请稍后再试。',
    error: '当前生成请求较多，请稍后再试。',
  });
});

test('generate vibe route forwards failure metadata to recordFailure on errors', async () => {
  const failureCalls: Array<Record<string, unknown>> = [];

  const handler = createGenerateVibeRouteHandler({
    async requireVerifiedRequestSession() {
      return createAuthorizedSessionResult();
    },
    async parseJsonObject() {
      return {};
    },
    parseGenerateVibeRequest() {
      return { historyItemId: 'history-1' };
    },
    async generateRoomVibeForUserWithDefaults() {
      throw createRouteError({
        status: 404,
        code: 'HISTORY_ITEM_NOT_FOUND',
        message: 'History item not found.',
      });
    },
    errorResponse(error, fallbackMessage, status) {
      const spec = errorResponseSpec(error, fallbackMessage, status);
      return Response.json(spec.body, { status: spec.status });
    },
    async recordFailure(input) {
      failureCalls.push({
        userId: input.userId,
        requestId: input.requestId,
        durationMs: input.durationMs,
        error: input.error,
      });
    },
  });

  const response = await handler(new Request('http://localhost/api/generate-vibe', {
    method: 'POST',
    body: '{}',
    headers: { 'content-type': 'application/json' },
  }));

  assert.equal(response.status, 404);
  assert.equal(failureCalls.length, 1);
  assert.equal(failureCalls[0]?.userId, 'user-1');
  assert.equal(typeof failureCalls[0]?.requestId, 'string');
});

test('generate vibe route swallows recordFailure errors and still returns error response', async () => {
  const handler = createGenerateVibeRouteHandler({
    async requireVerifiedRequestSession() {
      return createAuthorizedSessionResult();
    },
    async parseJsonObject() {
      return {};
    },
    parseGenerateVibeRequest() {
      return { historyItemId: 'history-1' };
    },
    async generateRoomVibeForUserWithDefaults() {
      throw createRouteError({
        status: 500,
        code: 'INTERNAL_SERVER_ERROR',
        message: '出错了，请重新生成。',
      });
    },
    errorResponse(error, fallbackMessage, status) {
      const spec = errorResponseSpec(error, fallbackMessage, status);
      return Response.json(spec.body, { status: spec.status });
    },
    async recordFailure() {
      throw new Error('telemetry persistence failed');
    },
  });

  const response = await handler(new Request('http://localhost/api/generate-vibe', {
    method: 'POST',
    body: '{}',
    headers: { 'content-type': 'application/json' },
  }));
  const payload = await response.json();

  assert.equal(response.status, 500);
  assert.equal(payload.code, 'INTERNAL_SERVER_ERROR');
});
