import { Pool } from 'pg';
import { resolveDatabasePoolMax } from '../db-config.ts';
import { shouldIgnorePgPoolError } from '../db-error.ts';
import { createRouteError } from './http/error-envelope.ts';
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
  connectionString?: string;
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

const GENERATION_CONNECTIVITY_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ETIMEDOUT',
]);

type GenerationConcurrencyConnectError = Error & {
  address?: string;
  code?: string;
  port?: number;
  syscall?: string;
};

function toClientReleaseError(error: unknown) {
  return error instanceof Error
    ? error
    : new Error('Failed to release generation concurrency advisory locks safely.');
}

function readConnectionTarget(connectionString?: string) {
  if (!connectionString) {
    return null;
  }

  try {
    const parsed = new URL(connectionString);
    return {
      host: parsed.hostname,
      port: parsed.port || null,
    };
  } catch {
    return null;
  }
}

function isSupabaseDirectConnectionHost(host: string | null | undefined) {
  if (!host) {
    return false;
  }

  return host.startsWith('db.') && host.endsWith('.supabase.co');
}

function toGenerationConnectivityRouteError(
  error: unknown
) {
  if (!(error instanceof Error)) {
    return null;
  }

  const connectError = error as GenerationConcurrencyConnectError;
  const code = connectError.code?.trim().toUpperCase();
  const syscall = connectError.syscall?.trim().toLowerCase();

  if (!code || !GENERATION_CONNECTIVITY_ERROR_CODES.has(code)) {
    return null;
  }

  if (syscall && syscall !== 'connect') {
    return null;
  }

  return createRouteError({
    status: 503,
    code: 'GENERATION_LOCK_DATABASE_UNREACHABLE',
    message: '当前生成服务暂时不可用，请稍后重试；如果持续出现，请联系管理员检查数据库直连或会话池配置。',
  });
}

function logGenerationConcurrencyConnectFailure(
  error: unknown,
  connectionString?: string
) {
  const connectError = error as GenerationConcurrencyConnectError;
  const target = readConnectionTarget(connectionString);
  const hint = isSupabaseDirectConnectionHost(target?.host) && target?.port === '5432'
    ? 'Supabase direct host on port 5432 may require IPv6 egress. Prefer the session pooler host on port 5432 when IPv6 is unavailable.'
    : null;

  console.error(
    '[generation-concurrency] failed to connect advisory lock database',
    {
      code: connectError.code ?? null,
      syscall: connectError.syscall ?? null,
      address: connectError.address ?? null,
      port: connectError.port ?? null,
      connectionHost: target?.host ?? null,
      connectionPort: target?.port ?? null,
      hint,
    },
    error
  );
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
    if (!pool) {
      throw new Error('Generation concurrency pool initialization failed.');
    }

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
  ): Promise<T> {
    let client: GuardClient | null = null;
    let actionError: unknown = null;
    let clientReleaseError: Error | null = null;

    try {
      try {
        client = await deps.connect();
      } catch (error) {
        const normalizedError = toGenerationConnectivityRouteError(error);
        if (normalizedError) {
          logGenerationConcurrencyConnectFailure(error, deps.connectionString);
          throw normalizedError;
        }

        throw error;
      }

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
      if (client) {
        if (clientReleaseError) {
          client.release(clientReleaseError);
        } else {
          client.release();
        }
      }
    }

    throw new Error('Generation concurrency guard finished without returning or throwing.');
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
    connectionString: getGenerationConcurrencyConnectionString(),
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
