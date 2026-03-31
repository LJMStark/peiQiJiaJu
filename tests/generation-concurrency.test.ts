import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createGenerationConcurrencyGuard,
  resolveGenerationConcurrencyConnectionString,
} from '../lib/server/generation-concurrency.ts';
import { RouteError } from '../lib/server/http/error-envelope.ts';
import {
  acquireGenerationConcurrencyLease,
  GenerationConcurrencyCleanupError,
  resolveGlobalGenerationConcurrencyLimit,
  validateGenerationConcurrencyLimit,
} from '../lib/generation-concurrency-core.ts';

function createQueryClient(results: Array<{ rows: Array<Record<string, unknown>> } | Error>) {
  const calls: Array<{ sql: string; values: readonly unknown[] }> = [];

  return {
    calls,
    client: {
      async query<T extends Record<string, unknown>>(sql: string, values: readonly unknown[] = []) {
        calls.push({ sql, values });
        const next = results.shift();
        if (!next) {
          throw new Error(`Unexpected query: ${sql}`);
        }

        if (next instanceof Error) {
          throw next;
        }

        return next as { rows: T[] };
      },
    },
  };
}

function createGuardClient(results: Array<{ rows: Array<Record<string, unknown>> } | Error>) {
  const { client, calls } = createQueryClient(results);
  const releaseCalls: Array<boolean | Error | undefined> = [];

  return {
    calls,
    releaseCalls,
    client: {
      ...client,
      release(destroy?: boolean | Error) {
        releaseCalls.push(destroy);
      },
    },
  };
}

function createSharedLockHarness() {
  const locks = new Map<string, string>();
  let nextClientId = 1;

  return {
    lock(slot: number, owner = 'external') {
      locks.set(`32025:${slot}`, owner);
    },
    connect(options: {
      failUnlockKeys?: string[];
    } = {}) {
      const clientId = `client-${nextClientId}`;
      nextClientId += 1;
      const heldKeys = new Set<string>();
      const releaseCalls: Array<boolean | Error | undefined> = [];
      const failUnlockKeys = new Set(options.failUnlockKeys ?? []);

      const client = {
        async query<T extends Record<string, unknown>>(sql: string, values: readonly unknown[] = []) {
          const key = `${values[0]}:${values[1]}`;

          if (sql.includes('pg_try_advisory_lock')) {
            const owner = locks.get(key);
            if (owner && owner !== clientId) {
              return { rows: [{ locked: false }] as unknown as T[] };
            }
            locks.set(key, clientId);
            heldKeys.add(key);
            return { rows: [{ locked: true }] as unknown as T[] };
          }

          if (sql.includes('pg_advisory_unlock')) {
            if (failUnlockKeys.has(key)) {
              failUnlockKeys.delete(key);
              throw new Error(`unlock failed for ${key}`);
            }

            const owner = locks.get(key);
            if (owner !== clientId) {
              return { rows: [{ unlocked: false }] as unknown as T[] };
            }

            locks.delete(key);
            heldKeys.delete(key);
            return { rows: [{ unlocked: true }] as unknown as T[] };
          }

          throw new Error(`Unexpected query: ${sql}`);
        },
        release(destroy?: boolean | Error) {
          releaseCalls.push(destroy);
          if (destroy) {
            for (const key of heldKeys) {
              if (locks.get(key) === clientId) {
                locks.delete(key);
              }
            }
            heldKeys.clear();
          }
        },
      };

      return {
        client,
        releaseCalls,
      };
    },
  };
}

test('resolveGlobalGenerationConcurrencyLimit falls back to the default when the env is invalid', () => {
  assert.equal(resolveGlobalGenerationConcurrencyLimit(undefined), 2);
  assert.equal(resolveGlobalGenerationConcurrencyLimit(''), 2);
  assert.equal(resolveGlobalGenerationConcurrencyLimit('0'), 2);
  assert.equal(resolveGlobalGenerationConcurrencyLimit('3'), 3);
});

test('resolveGenerationConcurrencyConnectionString prefers DIRECT_URL for session-scoped locks', () => {
  assert.equal(
    resolveGenerationConcurrencyConnectionString({
      databaseUrl: 'postgres://pooler',
      directUrl: 'postgres://direct',
    }),
    'postgres://direct'
  );

  assert.equal(
    resolveGenerationConcurrencyConnectionString({
      databaseUrl: 'postgres://pooler',
    }),
    'postgres://pooler'
  );

  assert.equal(
    resolveGenerationConcurrencyConnectionString({
      databaseUrl: 'postgres://pooler',
      directUrl: '',
    }),
    'postgres://pooler'
  );
});

test('validateGenerationConcurrencyLimit keeps database headroom for queries', () => {
  assert.equal(validateGenerationConcurrencyLimit(2, 5), 2);
  assert.throws(
    () => validateGenerationConcurrencyLimit(5, 5),
    /must be lower than DATABASE_POOL_MAX/
  );
});

test('acquireGenerationConcurrencyLease rejects when the same user already has an active generation', async () => {
  const { client, calls } = createQueryClient([
    { rows: [{ locked: false }] },
  ]);

  await assert.rejects(
    () => acquireGenerationConcurrencyLease(client, 'user-1', 2),
    (error) => {
      assert.ok(error instanceof RouteError);
      assert.equal(error.status, 409);
      assert.equal(error.code, 'GENERATION_ALREADY_RUNNING');
      return true;
    }
  );

  assert.equal(calls.length, 1);
  assert.match(calls[0]?.sql ?? '', /pg_try_advisory_lock/);
});

test('acquireGenerationConcurrencyLease releases the user lock when global capacity is exhausted', async () => {
  const { client, calls } = createQueryClient([
    { rows: [{ locked: true }] },
    { rows: [{ locked: false }] },
    { rows: [{ locked: false }] },
    { rows: [{ unlocked: true }] },
  ]);

  await assert.rejects(
    () => acquireGenerationConcurrencyLease(client, 'user-1', 2),
    (error) => {
      assert.ok(error instanceof RouteError);
      assert.equal(error.status, 429);
      assert.equal(error.code, 'GENERATION_CAPACITY_REACHED');
      return true;
    }
  );

  assert.equal(calls.length, 4);
  assert.match(calls[3]?.sql ?? '', /pg_advisory_unlock/);
});

test('acquireGenerationConcurrencyLease surfaces rollback failures during acquire cleanup', async () => {
  const { client } = createQueryClient([
    { rows: [{ locked: true }] },
    { rows: [{ locked: false }] },
    new Error('unlock failed'),
  ]);

  await assert.rejects(
    () => acquireGenerationConcurrencyLease(client, 'user-1', 1),
    (error) => {
      assert.ok(error instanceof GenerationConcurrencyCleanupError);
      assert.match(
        error.message,
        /Failed to roll back generation concurrency advisory locks during acquire/
      );
      assert.ok(error.originalError instanceof RouteError);
      assert.equal(error.originalError.status, 429);
      return true;
    }
  );
});

test('acquireGenerationConcurrencyLease releases both locks after a successful run', async () => {
  const { client, calls } = createQueryClient([
    { rows: [{ locked: true }] },
    { rows: [{ locked: false }] },
    { rows: [{ locked: true }] },
    { rows: [{ unlocked: true }] },
    { rows: [{ unlocked: true }] },
  ]);

  const lease = await acquireGenerationConcurrencyLease(client, 'user-1', 2);

  assert.equal(lease.slot, 2);
  await lease.release();

  assert.equal(calls.length, 5);
  assert.match(calls[3]?.sql ?? '', /pg_advisory_unlock/);
  assert.match(calls[4]?.sql ?? '', /pg_advisory_unlock/);
});

test('acquireGenerationConcurrencyLease keeps lock state so release can be retried after a partial cleanup failure', async () => {
  const { client, calls } = createQueryClient([
    { rows: [{ locked: true }] },
    { rows: [{ locked: true }] },
    new Error('unlock failed'),
    { rows: [{ unlocked: true }] },
    { rows: [{ unlocked: true }] },
  ]);

  const lease = await acquireGenerationConcurrencyLease(client, 'user-1', 1);

  await assert.rejects(
    () => lease.release(),
    (error) => {
      assert.ok(error instanceof GenerationConcurrencyCleanupError);
      return true;
    }
  );

  await lease.release();

  assert.equal(calls.length, 5);
  assert.match(calls[2]?.sql ?? '', /pg_advisory_unlock/);
  assert.match(calls[3]?.sql ?? '', /pg_advisory_unlock/);
  assert.match(calls[4]?.sql ?? '', /pg_advisory_unlock/);
});

test('runWithGenerationConcurrencyGuard destroys the connection when lease release fails', async () => {
  const harness = createSharedLockHarness();
  const firstHarness = harness.connect({
    failUnlockKeys: ['32025:1'],
  });
  const secondHarness = harness.connect();
  const clients = [firstHarness.client, secondHarness.client];
  const guard = createGenerationConcurrencyGuard({
    async connect() {
      const client = clients.shift();
      if (!client) {
        throw new Error('No more clients available.');
      }
      return client;
    },
    globalLimit: 1,
  });

  await assert.rejects(
    () => guard('user-1', async () => 'ok'),
    (error) => {
      assert.ok(error instanceof GenerationConcurrencyCleanupError);
      return true;
    }
  );

  const secondResult = await guard('user-2', async () => 'ok');

  assert.equal(secondResult, 'ok');
  assert.equal(firstHarness.releaseCalls.length, 1);
  assert.ok(firstHarness.releaseCalls[0] instanceof Error);
  assert.deepEqual(secondHarness.releaseCalls, [undefined]);
});

test('runWithGenerationConcurrencyGuard destroys the connection when acquire rollback fails', async () => {
  const harness = createGuardClient([
    { rows: [{ locked: true }] },
    { rows: [{ locked: false }] },
    new Error('unlock failed'),
  ]);
  const guard = createGenerationConcurrencyGuard({
    async connect() {
      return harness.client;
    },
    globalLimit: 1,
  });

  await assert.rejects(
    () => guard('user-1', async () => 'ok'),
    (error) => {
      assert.ok(error instanceof GenerationConcurrencyCleanupError);
      assert.match(
        error.message,
        /Failed to roll back generation concurrency advisory locks during acquire/
      );
      return true;
    }
  );

  assert.equal(harness.releaseCalls.length, 1);
  assert.ok(harness.releaseCalls[0] instanceof Error);
});

test('runWithGenerationConcurrencyGuard preserves the original action error while destroying a broken lock connection', async () => {
  const harness = createGuardClient([
    { rows: [{ locked: true }] },
    { rows: [{ locked: true }] },
    new Error('unlock failed'),
  ]);
  const guard = createGenerationConcurrencyGuard({
    async connect() {
      return harness.client;
    },
    globalLimit: 1,
  });
  const originalActionError = new Error('generation failed');
  const logs: unknown[][] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    logs.push(args);
  };

  try {
    await assert.rejects(
      () => guard('user-1', async () => {
        throw originalActionError;
      }),
      (error) => {
        assert.equal(error, originalActionError);
        return true;
      }
    );
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(harness.releaseCalls.length, 1);
  assert.ok(harness.releaseCalls[0] instanceof Error);
  assert.equal(logs.length, 1);
  assert.match(String(logs[0]?.[0] ?? ''), /failed to release advisory locks/);
});
