import assert from 'node:assert/strict';
import test from 'node:test';

import { errorResponseSpec, notFoundSpec } from '../lib/server/http/error-envelope.ts';
import { createAssetDownloadRouteHandler } from '../lib/server/asset-download-route-handler.ts';

function createAuthorizedSessionResult() {
  return {
    response: null,
    session: {
      user: {
        id: 'user-1',
      },
    },
  };
}

test('download route returns 404 when the asset is not owned by the current user', async () => {
  const handler = createAssetDownloadRouteHandler({
    async requireVerifiedRequestSession() {
      return createAuthorizedSessionResult();
    },
    async findOwnedAssetDownload() {
      return null;
    },
    async downloadStoredImageBytes() {
      throw new Error('should not download unowned assets');
    },
    badRequest(message, code = 'BAD_REQUEST') {
      return Response.json({ code, message, error: message }, { status: 400 });
    },
    notFound(message = '资源不存在。', code = 'NOT_FOUND') {
      const spec = notFoundSpec(message, code);
      return Response.json(spec.body, { status: spec.status });
    },
    errorResponse(error, fallbackMessage, status) {
      const spec = errorResponseSpec(error, fallbackMessage, status);
      return Response.json(spec.body, { status: spec.status });
    },
  });

  const response = await handler(
    new Request('http://localhost/api/assets/download?kind=generated&storagePath=user-2/generated/demo.jpg')
  );
  const payload = await response.json();

  assert.equal(response.status, 404);
  assert.deepEqual(payload, {
    code: 'NOT_FOUND',
    message: '下载图片不存在或无权访问。',
    error: '下载图片不存在或无权访问。',
  });
});

test('download route returns an attachment response for an owned asset', async () => {
  const handler = createAssetDownloadRouteHandler({
    async requireVerifiedRequestSession() {
      return createAuthorizedSessionResult();
    },
    async findOwnedAssetDownload() {
      return {
        kind: 'generated',
        storagePath: 'user-1/generated/demo.jpg',
        name: '客厅效果图',
        mimeType: 'image/jpeg',
      };
    },
    async downloadStoredImageBytes() {
      return new TextEncoder().encode('image-bytes');
    },
    badRequest(message, code = 'BAD_REQUEST') {
      return Response.json({ code, message, error: message }, { status: 400 });
    },
    notFound(message = '资源不存在。', code = 'NOT_FOUND') {
      const spec = notFoundSpec(message, code);
      return Response.json(spec.body, { status: spec.status });
    },
    errorResponse(error, fallbackMessage, status) {
      const spec = errorResponseSpec(error, fallbackMessage, status);
      return Response.json(spec.body, { status: spec.status });
    },
  });

  const response = await handler(
    new Request('http://localhost/api/assets/download?kind=generated&storagePath=user-1/generated/demo.jpg')
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/jpeg');
  assert.match(response.headers.get('content-disposition') ?? '', /^attachment;/);
  assert.match(response.headers.get('content-disposition') ?? '', /filename\*=UTF-8''/);
  assert.equal(Buffer.from(await response.arrayBuffer()).toString('utf8'), 'image-bytes');
});
