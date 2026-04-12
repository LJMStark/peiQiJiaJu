import assert from 'node:assert/strict';
import test from 'node:test';

import { RouteError } from '../lib/server/http/error-envelope.ts';
import { runGenerationWithAccess } from '../lib/server/services/generation-execution.ts';

const user = {
  id: 'user-1',
  role: 'user',
  vipExpiresAt: null,
} as const;

test('runGenerationWithAccess short-circuits expired memberships before running the action', async () => {
  let actionCalled = false;

  await assert.rejects(
    () =>
      runGenerationWithAccess(
        {
          ...user,
          vipExpiresAt: '2026-04-01T00:00:00.000Z',
        },
        {
          async getGenerationCount() {
            return 0;
          },
        },
        async () => {
          actionCalled = true;
          return 'ok';
        }
      ),
    (error) => {
      assert.ok(error instanceof RouteError);
      assert.equal(error.code, 'VIP_EXPIRED');
      return true;
    }
  );

  assert.equal(actionCalled, false);
});

test('runGenerationWithAccess short-circuits free-limit users before running the action', async () => {
  let actionCalled = false;

  await assert.rejects(
    () =>
      runGenerationWithAccess(
        user,
        {
          async getGenerationCount() {
            return 999;
          },
        },
        async () => {
          actionCalled = true;
          return 'ok';
        }
      ),
    (error) => {
      assert.ok(error instanceof RouteError);
      assert.equal(error.code, 'FREE_LIMIT_REACHED');
      return true;
    }
  );

  assert.equal(actionCalled, false);
});

test('runGenerationWithAccess executes concurrency guard before counting and running the action', async () => {
  const steps: string[] = [];

  const result = await runGenerationWithAccess(
    {
      ...user,
      role: 'admin',
    },
    {
      async runWithConcurrencyGuard(userId, action) {
        steps.push(`guard:${userId}`);
        return action();
      },
      async getGenerationCount(userId) {
        steps.push(`count:${userId}`);
        return 0;
      },
    },
    async () => {
      steps.push('action');
      return 'ok';
    }
  );

  assert.equal(result, 'ok');
  assert.deepEqual(steps, ['guard:user-1', 'count:user-1', 'action']);
});
