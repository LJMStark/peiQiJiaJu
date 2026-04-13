import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildAssetDownloadPath,
  createAttachmentContentDisposition,
  getAssetDownloadFilename,
} from '../lib/asset-download.ts';

test('buildAssetDownloadPath encodes kind and storage path for same-origin downloads', () => {
  const href = buildAssetDownloadPath('generated', {
    storagePath: 'user-1/generated/my image.jpg',
  });

  assert.equal(
    href,
    '/api/assets/download?kind=generated&storagePath=user-1%2Fgenerated%2Fmy+image.jpg'
  );
});

test('getAssetDownloadFilename reuses the stored extension when the display name has none', () => {
  assert.equal(
    getAssetDownloadFilename('客厅效果图', 'user-1/generated/result-image.webp'),
    '客厅效果图.webp'
  );
});

test('createAttachmentContentDisposition keeps a utf8 filename and a safe ascii fallback', () => {
  const header = createAttachmentContentDisposition('客厅效果图.webp');

  assert.match(header, /^attachment;/);
  assert.match(header, /filename="image\.webp"/);
  assert.match(header, /filename\*=UTF-8''%E5%AE%A2%E5%8E%85%E6%95%88%E6%9E%9C%E5%9B%BE\.webp/);
});
