import assert from 'node:assert/strict';
import test from 'node:test';

import { buildDashboardPath, resolveDashboardLocation } from '../lib/dashboard-navigation.ts';
import {
  INVITE_ATTRIBUTION_WINDOW_DAYS,
  INVITE_DASHBOARD_PATH,
  INVITE_DASHBOARD_TAB,
  INVITE_LEGACY_DASHBOARD_PATH,
  INVITE_COOKIE_NAME,
  INVITE_COOKIE_VERSION,
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  INVITE_LATE_CLAIM_WINDOW_HOURS,
  resolveSignupInviteCode,
  VIP_CENTER_DEFAULT_SECTION,
  VIP_CENTER_INVITE_SECTION,
  buildInviteUrl,
  decodeInviteCookie,
  encodeInviteCookie,
  generateInviteCode,
  getInviteCookieMaxAgeSeconds,
  maskInviteeCompanyName,
  maskInviteeEmail,
  normalizeInviteCode,
  readInviteCodeFromCookieHeader,
} from '../lib/invitations.ts';

test('generateInviteCode returns a high-entropy code from the safe alphabet', () => {
  const alphabet = new Set(INVITE_CODE_ALPHABET.split(''));

  for (let index = 0; index < 2_000; index += 1) {
    const code = generateInviteCode();

    assert.equal(code.length, INVITE_CODE_LENGTH);
    assert.ok([...code].every((char) => alphabet.has(char)), `unexpected char in ${code}`);
  }
});

test('maskInviteeEmail keeps the first two local-part characters and preserves the domain', () => {
  assert.equal(maskInviteeEmail('alice@example.com'), 'al***@example.com');
  assert.equal(maskInviteeEmail('a@example.com'), 'a***@example.com');
});

test('maskInviteeCompanyName keeps the first two visible characters', () => {
  assert.equal(maskInviteeCompanyName('佩奇家具有限公司'), '佩奇***');
  assert.equal(maskInviteeCompanyName('A'), 'A***');
});

test('buildInviteUrl creates a canonical invite path without leaking user identifiers', () => {
  assert.equal(buildInviteUrl('https://peiqi.example.com', 'ABCD1234'), 'https://peiqi.example.com/i/ABCD1234');
  assert.equal(buildInviteUrl('https://peiqi.example.com/', 'ABCD1234'), 'https://peiqi.example.com/i/ABCD1234');
});

test('normalizeInviteCode strips separators and uppercases input', () => {
  assert.equal(normalizeInviteCode(' abcd-1234 ef '), 'ABCD1234EF');
});

test('invite cookie payload round-trips code and version safely', () => {
  const encoded = encodeInviteCookie({ code: 'INVITE000001' });

  assert.deepEqual(decodeInviteCookie(encoded), {
    version: INVITE_COOKIE_VERSION,
    code: 'INVITE000001',
  });
});

test('readInviteCodeFromCookieHeader extracts the normalized invite code from mixed cookies', () => {
  const cookieHeader = `foo=bar; ${INVITE_COOKIE_NAME}=${encodeInviteCookie({ code: 'invite-000001' })}; theme=dark`;

  assert.equal(readInviteCodeFromCookieHeader(cookieHeader), 'INVITE000001');
  assert.equal(readInviteCodeFromCookieHeader('foo=bar'), null);
});

test('invite timing windows match the product rules', () => {
  assert.equal(INVITE_ATTRIBUTION_WINDOW_DAYS, 7);
  assert.equal(INVITE_LATE_CLAIM_WINDOW_HOURS, 24);
  assert.equal(getInviteCookieMaxAgeSeconds(), 7 * 24 * 60 * 60);
  assert.equal(INVITE_COOKIE_NAME, 'peiqi_invite');
  assert.equal(INVITE_DASHBOARD_TAB, 'invite');
  assert.equal(INVITE_LEGACY_DASHBOARD_PATH, '/?tab=invite');
  assert.equal(INVITE_DASHBOARD_PATH, '/?tab=vip&section=invite');
});

test('resolveSignupInviteCode prefers the submitted form value before the cookie fallback', () => {
  assert.equal(
    resolveSignupInviteCode({
      requestInviteCode: ' abcd-1234 ',
      cookieInviteCode: 'WXYZ9999',
    }),
    'ABCD1234'
  );

  assert.equal(
    resolveSignupInviteCode({
      requestInviteCode: '   ',
      cookieInviteCode: 'invite-000001',
    }),
    'INVITE000001'
  );

  assert.equal(
    resolveSignupInviteCode({
      requestInviteCode: null,
      cookieInviteCode: null,
    }),
    null
  );
});

test('resolveDashboardLocation maps the legacy invite tab to the vip invite section', () => {
  assert.deepEqual(resolveDashboardLocation(INVITE_DASHBOARD_TAB, null), {
    activeTab: 'vip',
    vipSection: VIP_CENTER_INVITE_SECTION,
    canonicalPath: '/?tab=vip&section=invite',
  });
});

test('dashboard navigation helpers build canonical vip paths without keeping invalid sections', () => {
  assert.equal(buildDashboardPath('catalog'), '/');
  assert.equal(buildDashboardPath('editor'), '/?tab=editor');
  assert.equal(buildDashboardPath('vip'), '/?tab=vip');
  assert.equal(buildDashboardPath('vip', { vipSection: VIP_CENTER_INVITE_SECTION }), '/?tab=vip&section=invite');

  assert.deepEqual(resolveDashboardLocation('vip', 'unknown'), {
    activeTab: 'vip',
    vipSection: VIP_CENTER_DEFAULT_SECTION,
    canonicalPath: '/?tab=vip',
  });
});
