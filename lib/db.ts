import 'server-only';

import { Pool, type PoolConfig, type QueryResult, type QueryResultRow } from 'pg';
import { shouldIgnorePgPoolError } from '@/lib/db-error';
import { resolveDatabasePoolMax } from '@/lib/db-config';

const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? '';

if (!connectionString) {
  throw new Error('DATABASE_URL or DIRECT_URL is not set. Add a database connection to your local .env file before using the database.');
}

export const DATABASE_POOL_MAX = resolveDatabasePoolMax();

const poolConfig: PoolConfig = {
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  max: DATABASE_POOL_MAX,
};

const globalForDb = globalThis as typeof globalThis & {
  __pgPool?: Pool;
  __pgPoolErrorHandlersRegistered?: boolean;
};

export const db = globalForDb.__pgPool ?? new Pool(poolConfig);

function handlePgPoolError(error: unknown) {
  if (shouldIgnorePgPoolError(error)) {
    return;
  }

  console.error('Unexpected Postgres pool error:', error);
}

if (!globalForDb.__pgPoolErrorHandlersRegistered) {
  db.on('error', handlePgPoolError);
  db.on('connect', (client) => {
    client.on('error', handlePgPoolError);
  });
  globalForDb.__pgPoolErrorHandlersRegistered = true;
}

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__pgPool = db;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: readonly unknown[] = []
): Promise<QueryResult<T>> {
  return db.query<T>(text, [...values]);
}
