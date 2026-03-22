import assert from 'node:assert/strict';
import test from 'node:test';

import { getSiteBaseUrl } from '../lib/site-url.ts';

test('getSiteBaseUrl prefers the configured base url and trims the trailing slash', () => {
  assert.equal(
    getSiteBaseUrl({
      appUrl: 'https://peiqijiaju.com/',
      nextPublicBaseUrl: 'https://cdn.example.com/',
      nodeEnv: 'production',
      requestUrl: 'https://ignored.example.com/api/invitations/me',
    }),
    'https://cdn.example.com'
  );
});

test('getSiteBaseUrl falls back to the request origin during local development', () => {
  assert.equal(
    getSiteBaseUrl({
      appUrl: '',
      nextPublicBaseUrl: '',
      nodeEnv: 'development',
      requestUrl: 'http://localhost:3000/api/invitations/me',
    }),
    'http://localhost:3000'
  );
});

test('getSiteBaseUrl fails explicitly in production when the canonical domain is missing', () => {
  assert.throws(
    () =>
      getSiteBaseUrl({
        appUrl: '',
        nextPublicBaseUrl: '',
        nodeEnv: 'production',
        requestUrl: 'https://preview.example.com/api/invitations/me',
      }),
    /SITE_BASE_URL_NOT_CONFIGURED/
  );
});
