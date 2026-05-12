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

test('generate route forwards failure metadata to recordFailure on errors', async () => {
  const failureCalls: Array<Record<string, unknown>> = [];

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
    async recordFailure(input) {
      failureCalls.push({
        userId: input.userId,
        requestId: input.requestId,
        durationMs: input.durationMs,
        error: input.error,
      });
    },
  });

  const response = await handler(new Request('http://localhost/api/generate', {
    method: 'POST',
    body: '{}',
    headers: { 'content-type': 'application/json' },
  }));

  assert.equal(response.status, 409);
  assert.equal(failureCalls.length, 1);
  assert.equal(failureCalls[0]?.userId, 'user-1');
  assert.equal(typeof failureCalls[0]?.requestId, 'string');
  assert.equal(typeof failureCalls[0]?.durationMs, 'number');
  assert.ok(failureCalls[0]?.error instanceof Error);
});

test('generate route still returns error response when recordFailure throws', async () => {
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

  const response = await handler(new Request('http://localhost/api/generate', {
    method: 'POST',
    body: '{}',
    headers: { 'content-type': 'application/json' },
  }));
  const payload = await response.json();

  assert.equal(response.status, 500);
  assert.equal(payload.code, 'INTERNAL_SERVER_ERROR');
});

test('generate route does not invoke recordFailure on success', async () => {
  let failureCalls = 0;
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
      return { id: 'history-1' };
    },
    errorResponse(error, fallbackMessage, status) {
      const spec = errorResponseSpec(error, fallbackMessage, status);
      return Response.json(spec.body, { status: spec.status });
    },
    async recordFailure() {
      failureCalls += 1;
    },
  });

  const response = await handler(new Request('http://localhost/api/generate', {
    method: 'POST',
    body: '{}',
    headers: { 'content-type': 'application/json' },
  }));

  assert.equal(response.status, 201);
  assert.equal(failureCalls, 0);
});
