import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ADMIN_NAV_ITEMS,
  getShanghaiDayRange,
  isAdminNavActive,
  isAdminRole,
} from '../app/admin/admin-shared.ts';

test('getShanghaiDayRange returns the full natural day in Asia/Shanghai', () => {
  const now = new Date('2026-03-17T18:28:50+08:00');
  const { start, end } = getShanghaiDayRange(now);

  assert.equal(start.toISOString(), '2026-03-16T16:00:00.000Z');
  assert.equal(end.toISOString(), '2026-03-17T16:00:00.000Z');
});

test('isAdminNavActive only highlights the dashboard on the dashboard route', () => {
  assert.equal(isAdminNavActive('/admin', '/admin'), true);
  assert.equal(isAdminNavActive('/admin/codes', '/admin'), false);
});

test('isAdminNavActive keeps nested admin sections highlighted', () => {
  assert.equal(isAdminNavActive('/admin/codes', '/admin/codes'), true);
  assert.equal(isAdminNavActive('/admin/codes/detail', '/admin/codes'), true);
  assert.equal(isAdminNavActive('/admin/invitations', '/admin/invitations'), true);
});

test('admin nav includes the invitation management section', () => {
  assert.equal(ADMIN_NAV_ITEMS.some((item) => item.href === '/admin/invitations'), true);
});

test('isAdminRole only allows the admin role', () => {
  assert.equal(isAdminRole('admin'), true);
  assert.equal(isAdminRole('user'), false);
  assert.equal(isAdminRole(undefined), false);
});
