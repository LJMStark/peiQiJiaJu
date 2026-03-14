import 'server-only';

import { Pool, type PoolConfig, type QueryResult, type QueryResultRow } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Add it to your local .env file before using the database.');
}

const poolConfig: PoolConfig = {
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 5,
};

const globalForDb = globalThis as typeof globalThis & {
  __pgPool?: Pool;
};

export const db = globalForDb.__pgPool ?? new Pool(poolConfig);

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__pgPool = db;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: readonly unknown[] = []
): Promise<QueryResult<T>> {
  return db.query<T>(text, [...values]);
}
