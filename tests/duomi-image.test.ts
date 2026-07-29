import assert from 'node:assert/strict';
import test from 'node:test';
import { createDuomiImageClient } from '../lib/server/duomi-image-client.ts';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('Duomi image client submits Nano Banana 2 image editing tasks', async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const client = createDuomiImageClient({
    apiKey: 'duomi-test-key',
    apiBase: 'https://duomi.example',
    async fetchImpl(url, init) {
      requests.push({ url: String(url), init });
      return jsonResponse({ code: 200, data: { task_id: 'task-123' } });
    },
  });

  const taskId = await client.createImageEditTask({
    prompt: '把家具放进房间',
    imageUrls: ['https://assets.example/room.webp', 'https://assets.example/sofa.webp'],
    aspectRatio: '16:9',
    imageSize: '2K',
  });

  assert.equal(taskId, 'task-123');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://duomi.example/api/gemini/nano-banana-edit');
  assert.equal(requests[0].init?.method, 'POST');
  assert.deepEqual(requests[0].init?.headers, {
    'Content-Type': 'application/json',
    Authorization: 'duomi-test-key',
  });
  assert.deepEqual(JSON.parse(String(requests[0].init?.body)), {
    model: 'gemini-3.1-flash-image-preview',
    prompt: '把家具放进房间',
    image_urls: ['https://assets.example/room.webp', 'https://assets.example/sofa.webp'],
    aspect_ratio: '16:9',
    image_size: '2K',
  });
});

test('Duomi image client polls until the generated image succeeds', async () => {
  const responses = [
    jsonResponse({ code: 200, data: { state: 'running' } }),
    jsonResponse({
      code: 200,
      data: {
        state: 'succeeded',
        data: { images: [{ url: 'https://cdn3.dmiapi.com/result.webp', file_name: 'result.webp' }] },
      },
    }),
  ];
  let sleepCount = 0;
  const client = createDuomiImageClient({
    apiKey: 'duomi-test-key',
    apiBase: 'https://duomi.example',
    fetchImpl: async () => responses.shift() ?? jsonResponse({}, 500),
    sleep: async () => {
      sleepCount += 1;
    },
  });

  const imageUrl = await client.waitForImage('task/with spaces');

  assert.equal(imageUrl, 'https://cdn3.dmiapi.com/result.webp');
  assert.equal(sleepCount, 1);
});

test('Duomi image client exposes provider error details', async () => {
  const client = createDuomiImageClient({
    apiKey: 'duomi-test-key',
    fetchImpl: async () => jsonResponse({ message: '余额不足' }, 402),
  });

  await assert.rejects(
    client.createImageEditTask({
      prompt: 'test',
      imageUrls: ['https://assets.example/source.webp'],
    }),
    /Duomi API 错误: 402 - 余额不足/
  );
});

test('Duomi image client rejects API-level failures returned with HTTP 200', async () => {
  const client = createDuomiImageClient({
    apiKey: 'duomi-test-key',
    fetchImpl: async () => jsonResponse({ code: 402, msg: '点数不足' }),
  });

  await assert.rejects(
    client.createImageEditTask({
      prompt: 'test',
      imageUrls: ['https://assets.example/source.webp'],
    }),
    /Duomi API 错误: 402 - 点数不足/
  );
});

test('Duomi image client fails explicitly when a successful task has no image', async () => {
  const client = createDuomiImageClient({
    apiKey: 'duomi-test-key',
    fetchImpl: async () => jsonResponse({
      code: 200,
      data: { state: 'succeeded', data: { images: [] } },
    }),
  });

  await assert.rejects(client.waitForImage('task-123'), /Duomi 任务成功但没有返回图片/);
});

test('Duomi image client accepts a direct task status payload', async () => {
  const client = createDuomiImageClient({
    apiKey: 'duomi-test-key',
    fetchImpl: async () => jsonResponse({
      state: 'succeeded',
      data: { images: [{ url: 'https://cdn3.dmiapi.com/direct.webp' }] },
    }),
  });

  assert.equal(await client.waitForImage('task-123'), 'https://cdn3.dmiapi.com/direct.webp');
});

test('Duomi image client rejects result URLs outside the provider CDN', async () => {
  const client = createDuomiImageClient({
    apiKey: 'duomi-test-key',
    fetchImpl: async () => jsonResponse({
      code: 200,
      data: {
        state: 'succeeded',
        data: { images: [{ url: 'http://127.0.0.1/internal' }] },
      },
    }),
  });

  await assert.rejects(client.waitForImage('task-123'), /Duomi 返回了不受信任的图片地址/);
});

test('Duomi image client stops polling after its deadline', async () => {
  let now = 0;
  const client = createDuomiImageClient({
    apiKey: 'duomi-test-key',
    timeoutMs: 2_000,
    pollIntervalMs: 1_000,
    now: () => now,
    sleep: async (durationMs) => {
      now += durationMs;
    },
    fetchImpl: async () => jsonResponse({ code: 200, data: { state: 'pending' } }),
  });

  await assert.rejects(client.waitForImage('task-123'), /Duomi 生图等待超时/);
});
