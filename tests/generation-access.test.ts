import assert from 'node:assert/strict';
import test from 'node:test';

import { FREE_GENERATION_LIMIT, getGenerationAccessState } from '../lib/generation-access.ts';

test('getGenerationAccessState allows admins to generate even after the free limit', () => {
  const access = getGenerationAccessState({
    role: 'admin',
    vipExpiresAt: null,
    generationCount: FREE_GENERATION_LIMIT,
    now: new Date('2026-03-21T12:00:00.000Z'),
  });

  assert.equal(access.isAdmin, true);
  assert.equal(access.vipExpired, false);
  assert.equal(access.freeLimitReached, false);
  assert.equal(access.canGenerate, true);
});

test('getGenerationAccessState blocks expired non-admin memberships', () => {
  const access = getGenerationAccessState({
    role: 'user',
    vipExpiresAt: '2026-03-20T12:00:00.000Z',
    generationCount: 0,
    now: new Date('2026-03-21T12:00:00.000Z'),
  });

  assert.equal(access.isAdmin, false);
  assert.equal(access.isVip, false);
  assert.equal(access.vipExpired, true);
  assert.equal(access.canGenerate, true);
});

test('getGenerationAccessState enforces the free limit for regular users', () => {
  const access = getGenerationAccessState({
    role: 'user',
    vipExpiresAt: null,
    generationCount: FREE_GENERATION_LIMIT,
    now: new Date('2026-03-21T12:00:00.000Z'),
  });

  assert.equal(access.freeLimitReached, true);
  assert.equal(access.canGenerate, false);
});
