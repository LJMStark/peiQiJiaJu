import { Pool } from 'pg';
import { resolveDatabasePoolMax } from '../db-config.ts';
import { shouldIgnorePgPoolError } from '../db-error.ts';
import {
  acquireGenerationConcurrencyLease,
  type AdvisoryLockClient,
  GenerationConcurrencyCleanupError,
  resolveGlobalGenerationConcurrencyLimit,
  validateGenerationConcurrencyLimit,
} from '../generation-concurrency-core.ts';

type GuardClient = AdvisoryLockClient & {
  release: (destroy?: boolean | Error) => void;
};

type GenerationConcurrencyGuardDeps = {
  connect: () => Promise<GuardClient>;
  globalLimit: number;
};

type GenerationConcurrencyConnectionInput = {
  databaseUrl?: string;
  directUrl?: string;
};

const globalForGenerationConcurrency = globalThis as typeof globalThis & {
  __generationConcurrencyPool?: Pool;
  __generationConcurrencyPoolConnectionString?: string;
  __generationConcurrencyPoolErrorHandlersRegistered?: boolean;
};

function toClientReleaseError(error: unknown) {
  return error instanceof Error
    ? error
    : new Error('Failed to release generation concurrency advisory locks safely.');
}

export function resolveGenerationConcurrencyConnectionString(
  input: GenerationConcurrencyConnectionInput
) {
  const directUrl = input.directUrl?.trim();
  if (directUrl) {
    return directUrl;
  }

  const databaseUrl = input.databaseUrl?.trim();
  return databaseUrl ?? '';
}

function getGenerationConcurrencyConnectionString() {
  const connectionString = resolveGenerationConcurrencyConnectionString({
    databaseUrl: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  });

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL or DIRECT_URL is not set. Add a database connection to your local .env file before using generation concurrency guards.'
    );
  }

  return connectionString;
}

function handleGenerationConcurrencyPoolError(error: unknown) {
  if (shouldIgnorePgPoolError(error)) {
    return;
  }

  console.error('Unexpected generation concurrency Postgres pool error:', error);
}

function getGenerationConcurrencyPool() {
  const connectionString = getGenerationConcurrencyConnectionString();
  const poolMax = resolveDatabasePoolMax();
  let pool = globalForGenerationConcurrency.__generationConcurrencyPool;

  if (!pool || globalForGenerationConcurrency.__generationConcurrencyPoolConnectionString !== connectionString) {
    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      max: poolMax,
    });
    globalForGenerationConcurrency.__generationConcurrencyPool = pool;
    globalForGenerationConcurrency.__generationConcurrencyPoolConnectionString = connectionString;
    globalForGenerationConcurrency.__generationConcurrencyPoolErrorHandlersRegistered = false;
  }

  if (!globalForGenerationConcurrency.__generationConcurrencyPoolErrorHandlersRegistered) {
    pool.on('error', handleGenerationConcurrencyPoolError);
    pool.on('connect', (client) => {
      client.on('error', handleGenerationConcurrencyPoolError);
    });
    globalForGenerationConcurrency.__generationConcurrencyPoolErrorHandlersRegistered = true;
  }

  return pool;
}

export function createGenerationConcurrencyGuard(
  deps: GenerationConcurrencyGuardDeps
) {
  return async function runWithGenerationConcurrencyGuard<T>(
    userId: string,
    action: () => Promise<T>
  ) {
    const client = await deps.connect();
    let actionError: unknown = null;
    let clientReleaseError: Error | null = null;

    try {
      const lease = await acquireGenerationConcurrencyLease(
        client,
        userId,
        deps.globalLimit
      );

      try {
        return await action();
      } catch (error) {
        actionError = error;
        throw error;
      } finally {
        try {
          await lease.release();
        } catch (releaseError) {
          clientReleaseError = toClientReleaseError(releaseError);
          if (actionError) {
            console.error('[generation-concurrency] failed to release advisory locks', {
              userId,
            }, releaseError);
          } else {
            throw releaseError;
          }
        }
      }
    } catch (error) {
      if (error instanceof GenerationConcurrencyCleanupError) {
        clientReleaseError = toClientReleaseError(error);
      }
      throw error;
    } finally {
      if (clientReleaseError) {
        client.release(clientReleaseError);
      } else {
        client.release();
      }
    }
  };
}

let defaultGenerationConcurrencyGuard:
  | (<T>(userId: string, action: () => Promise<T>) => Promise<T>)
  | null = null;

async function getDefaultGenerationConcurrencyGuard() {
  if (defaultGenerationConcurrencyGuard) {
    return defaultGenerationConcurrencyGuard;
  }

  const databasePoolMax = resolveDatabasePoolMax();
  const globalLimit = validateGenerationConcurrencyLimit(
    resolveGlobalGenerationConcurrencyLimit(),
    databasePoolMax
  );
  const pool = getGenerationConcurrencyPool();

  defaultGenerationConcurrencyGuard = createGenerationConcurrencyGuard({
    async connect() {
      return pool.connect();
    },
    globalLimit,
  });

  return defaultGenerationConcurrencyGuard;
}

export async function runWithGenerationConcurrencyGuard<T>(
  userId: string,
  action: () => Promise<T>
) {
  const guard = await getDefaultGenerationConcurrencyGuard();
  return guard(userId, action);
}
