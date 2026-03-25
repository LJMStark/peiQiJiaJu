import { createHash } from 'node:crypto';
import { createRouteError } from './server/http/error-envelope.ts';

type AdvisoryLockRow = {
  locked: boolean;
};

type AdvisoryUnlockRow = {
  unlocked: boolean;
};

type AdvisoryKey = readonly [number, number];

export type AdvisoryLockClient = {
  query: <TRow extends Record<string, unknown>>(
    sql: string,
    values?: unknown[]
  ) => Promise<{ rows: TRow[] }>;
};

export type GenerationConcurrencyLease = {
  slot: number;
  release: () => Promise<void>;
};

const GLOBAL_GENERATION_LOCK_NAMESPACE = 32025;
const DEFAULT_GLOBAL_GENERATION_CONCURRENCY_LIMIT = 2;

export class GenerationConcurrencyCleanupError extends Error {
  cause?: unknown;
  originalError?: unknown;

  constructor(
    message: string,
    options: {
      cause?: unknown;
      originalError?: unknown;
    } = {}
  ) {
    super(message);
    this.name = 'GenerationConcurrencyCleanupError';
    this.cause = options.cause;
    this.originalError = options.originalError;
  }
}

function buildUserLockKey(userId: string): AdvisoryKey {
  const digest = createHash('sha256').update(userId).digest();
  return [digest.readInt32BE(0), digest.readInt32BE(4)];
}

function buildGlobalSlotKey(slot: number): AdvisoryKey {
  return [GLOBAL_GENERATION_LOCK_NAMESPACE, slot];
}

export function resolveGlobalGenerationConcurrencyLimit(
  envValue = process.env.GENERATION_GLOBAL_CONCURRENCY_LIMIT
) {
  const parsed = Number.parseInt(envValue?.trim() ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : DEFAULT_GLOBAL_GENERATION_CONCURRENCY_LIMIT;
}

export function validateGenerationConcurrencyLimit(
  globalLimit: number,
  databasePoolMax: number
) {
  const safeHeadroom = 2;
  const maxAllowed = Math.max(1, databasePoolMax - safeHeadroom);

  if (globalLimit > maxAllowed) {
    throw new Error(
      `GENERATION_GLOBAL_CONCURRENCY_LIMIT (${globalLimit}) must be lower than DATABASE_POOL_MAX (${databasePoolMax}) with at least ${safeHeadroom} spare connections.`
    );
  }

  return globalLimit;
}

async function tryAdvisoryLock(client: AdvisoryLockClient, key: AdvisoryKey) {
  const result = await client.query<AdvisoryLockRow>(
    'select pg_try_advisory_lock($1, $2) as locked',
    [key[0], key[1]]
  );
  return Boolean(result.rows[0]?.locked);
}

async function advisoryUnlock(
  client: AdvisoryLockClient,
  key: AdvisoryKey,
  description: string
) {
  try {
    const result = await client.query<AdvisoryUnlockRow>(
      'select pg_advisory_unlock($1, $2) as unlocked',
      [key[0], key[1]]
    );

    if (!result.rows[0]?.unlocked) {
      throw new Error(`${description} was not held by the current database session.`);
    }
  } catch (error) {
    throw new GenerationConcurrencyCleanupError(
      `Failed to release ${description}.`,
      { cause: error }
    );
  }
}

async function releaseLeaseLocks(
  client: AdvisoryLockClient,
  state: {
    userKey: AdvisoryKey;
    userLocked: boolean;
    slot: number | null;
  }
) {
  if (state.slot !== null) {
    await advisoryUnlock(
      client,
      buildGlobalSlotKey(state.slot),
      `global generation slot ${state.slot}`
    );
    state.slot = null;
  }

  if (state.userLocked) {
    await advisoryUnlock(client, state.userKey, 'user generation lock');
    state.userLocked = false;
  }
}

export async function acquireGenerationConcurrencyLease(
  client: AdvisoryLockClient,
  userId: string,
  globalLimit = resolveGlobalGenerationConcurrencyLimit()
): Promise<GenerationConcurrencyLease> {
  const state = {
    userKey: buildUserLockKey(userId),
    userLocked: false,
    slot: null as number | null,
  };

  try {
    state.userLocked = await tryAdvisoryLock(client, state.userKey);
    if (!state.userLocked) {
      throw createRouteError({
        status: 409,
        code: 'GENERATION_ALREADY_RUNNING',
        message: '您已有一个生成任务正在进行，请等待当前任务完成后再试。',
      });
    }

    for (let slot = 1; slot <= globalLimit; slot += 1) {
      const locked = await tryAdvisoryLock(client, buildGlobalSlotKey(slot));
      if (locked) {
        state.slot = slot;
        break;
      }
    }

    if (state.slot === null) {
      throw createRouteError({
        status: 429,
        code: 'GENERATION_CAPACITY_REACHED',
        message: '当前生成请求较多，请稍后再试。',
      });
    }

    return {
      slot: state.slot,
      async release() {
        await releaseLeaseLocks(client, state);
      },
    };
  } catch (error) {
    try {
      await releaseLeaseLocks(client, state);
    } catch (releaseError) {
      throw new GenerationConcurrencyCleanupError(
        'Failed to roll back generation concurrency advisory locks during acquire.',
        {
          cause: releaseError,
          originalError: error,
        }
      );
    }
    throw error;
  }
}
