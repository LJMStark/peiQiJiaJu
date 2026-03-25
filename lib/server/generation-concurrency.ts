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

function toClientReleaseError(error: unknown) {
  return error instanceof Error
    ? error
    : new Error('Failed to release generation concurrency advisory locks safely.');
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

  const { DATABASE_POOL_MAX, db } = await import('../db.ts');
  const globalLimit = validateGenerationConcurrencyLimit(
    resolveGlobalGenerationConcurrencyLimit(),
    DATABASE_POOL_MAX
  );

  defaultGenerationConcurrencyGuard = createGenerationConcurrencyGuard({
    async connect() {
      return db.connect();
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
