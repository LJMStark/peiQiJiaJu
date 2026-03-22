import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { redeemMembershipCode } from '../lib/server/services/membership-service.ts';

const projectRoot = process.cwd();

test('redeemMembershipCode extends an active membership from the existing expiry date', async () => {
  const calls = {
    begin: 0,
    commit: 0,
    rollback: 0,
    lookupCode: 0,
    markCodeUsed: 0,
    lookupUser: 0,
    updateVipExpiry: 0,
  };

  const currentVipExpiresAt = new Date('2026-03-25T00:00:00.000Z');
  const now = new Date('2026-03-21T00:00:00.000Z');

  const result = await redeemMembershipCode(
    {
      userId: 'user-1',
      code: 'vip-30days',
      now,
    },
    {
      async begin() {
        calls.begin += 1;
      },
      async commit() {
        calls.commit += 1;
      },
      async rollback() {
        calls.rollback += 1;
      },
      async findActiveCode(normalizedCode) {
        calls.lookupCode += 1;
        assert.equal(normalizedCode, 'VIP30DAYS');
        return {
          id: 'code-1',
          days: 30,
        };
      },
      async markCodeUsed(codeId, userId) {
        calls.markCodeUsed += 1;
        assert.equal(codeId, 'code-1');
        assert.equal(userId, 'user-1');
      },
      async findUserVipExpiry(userId) {
        calls.lookupUser += 1;
        assert.equal(userId, 'user-1');
        return currentVipExpiresAt;
      },
      async updateUserVipExpiry(userId, vipExpiresAt) {
        calls.updateVipExpiry += 1;
        assert.equal(userId, 'user-1');
        assert.equal(vipExpiresAt.toISOString(), '2026-04-24T00:00:00.000Z');
      },
      formatDate(date) {
        return date.toISOString().slice(0, 10);
      },
    }
  );

  assert.deepEqual(result, {
    success: true,
    message: '成功兑换 30 天，新的到期时间为 2026-04-24',
  });

  assert.deepEqual(calls, {
    begin: 1,
    commit: 1,
    rollback: 0,
    lookupCode: 1,
    markCodeUsed: 1,
    lookupUser: 1,
    updateVipExpiry: 1,
  });
});

test('vip redeem route no longer imports app/actions directly', async () => {
  const routeSource = await readFile(path.join(projectRoot, 'app/api/vip/redeem/route.ts'), 'utf8');

  assert.equal(
    routeSource.includes("@/app/actions/user"),
    false,
    'app/api/vip/redeem/route.ts should call a shared service instead of importing app/actions/user'
  );
});
