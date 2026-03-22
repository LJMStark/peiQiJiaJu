import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSiteUrl, getSiteBaseUrl } from '../lib/site-url.ts';

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

test('getSiteBaseUrl resolves the public origin from proxy headers instead of the internal request url', () => {
  assert.equal(
    getSiteBaseUrl({
      appUrl: '',
      nextPublicBaseUrl: '',
      nodeEnv: 'production',
      requestHeaders: new Headers({
        'x-forwarded-host': 'peiqijiaju.xyz',
        'x-forwarded-proto': 'https',
      }),
      requestUrl: 'http://service-69b58ec2800a475a1f82a700-5d4b6c8558-xj8dn:8080/api/invitations/me',
    }),
    'https://peiqijiaju.xyz'
  );
});

test('buildSiteUrl uses the forwarded public origin for absolute redirects', () => {
  assert.equal(
    buildSiteUrl('/signup?invited=1&code=XB65LPA5S2R4', {
      appUrl: '',
      nextPublicBaseUrl: '',
      nodeEnv: 'production',
      requestHeaders: new Headers({
        forwarded: 'proto=https;host=peiqijiaju.xyz',
      }),
      requestUrl: 'http://service-69b58ec2800a475a1f82a700-5d4b6c8558-xj8dn:8080/i/XB65LPA5S2R4',
    }).toString(),
    'https://peiqijiaju.xyz/signup?invited=1&code=XB65LPA5S2R4'
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
