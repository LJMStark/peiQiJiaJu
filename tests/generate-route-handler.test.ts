import assert from 'node:assert/strict';
import test from 'node:test';

import { createRouteError, errorResponseSpec } from '../lib/server/http/error-envelope.ts';
import { createGenerateRouteHandler } from '../lib/server/generate-route-handler.ts';

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

test('generate route returns 409 when the same user already has an active generation', async () => {
  const handler = createGenerateRouteHandler({
    async requireVerifiedRequestSession() {
      return createAuthorizedSessionResult();
    },
    async parseJsonObject() {
      return {};
    },
    parseGenerateRequest() {
      return {
        roomImageId: 'room-1',
        historyItemId: null,
        furnitureItemIds: ['furniture-1'],
        customInstruction: null,
      };
    },
    async generateRoomVisualizationForUserWithDefaults() {
      throw createRouteError({
        status: 409,
        code: 'GENERATION_ALREADY_RUNNING',
        message: '您已有一个生成任务正在进行，请等待当前任务完成后再试。',
      });
    },
    errorResponse(error, fallbackMessage, status) {
      const spec = errorResponseSpec(error, fallbackMessage, status);
      return Response.json(spec.body, { status: spec.status });
    },
  });

  const response = await handler(new Request('http://localhost/api/generate', {
    method: 'POST',
    body: '{}',
    headers: { 'content-type': 'application/json' },
  }));
  const payload = await response.json();

  assert.equal(response.status, 409);
  assert.deepEqual(payload, {
    code: 'GENERATION_ALREADY_RUNNING',
    message: '您已有一个生成任务正在进行，请等待当前任务完成后再试。',
    error: '您已有一个生成任务正在进行，请等待当前任务完成后再试。',
  });
});

test('generate route returns 429 when global generation capacity is exhausted', async () => {
  const handler = createGenerateRouteHandler({
    async requireVerifiedRequestSession() {
      return createAuthorizedSessionResult();
    },
    async parseJsonObject() {
      return {};
    },
    parseGenerateRequest() {
      return {
        roomImageId: 'room-1',
        historyItemId: null,
        furnitureItemIds: ['furniture-1'],
        customInstruction: null,
      };
    },
    async generateRoomVisualizationForUserWithDefaults() {
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

  const response = await handler(new Request('http://localhost/api/generate', {
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
