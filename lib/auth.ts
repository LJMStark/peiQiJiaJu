import 'server-only';

import { betterAuth } from 'better-auth';
import { headers } from 'next/headers';
import { cache } from 'react';
import { Pool } from 'pg';

type AuthConfigOptions = {
  preferDirect?: boolean;
};

const globalForAuth = globalThis as typeof globalThis & {
  __betterAuthPools?: Map<string, Pool>;
};

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL ?? process.env.APP_URL ?? 'http://localhost:3000';
}

function getAuthSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'development-only-secret-change-me-before-production';
  }

  throw new Error('BETTER_AUTH_SECRET is not set.');
}

function getConnectionString({ preferDirect = false }: AuthConfigOptions = {}) {
  if (preferDirect && process.env.DIRECT_URL) {
    return process.env.DIRECT_URL;
  }

  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (process.env.DIRECT_URL) {
    return process.env.DIRECT_URL;
  }

  throw new Error('DATABASE_URL is not set. Add DATABASE_URL or DIRECT_URL to your .env file.');
}

function getPool(connectionString: string) {
  const pools = globalForAuth.__betterAuthPools ?? new Map<string, Pool>();
  globalForAuth.__betterAuthPools = pools;

  const existingPool = pools.get(connectionString);
  if (existingPool) {
    return existingPool;
  }

  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 10,
  });

  pools.set(connectionString, pool);
  return pool;
}

export function createAuth(config: AuthConfigOptions = {}) {
  return betterAuth({
    baseURL: getBaseUrl(),
    secret: getAuthSecret(),
    database: getPool(getConnectionString(config)),
    emailAndPassword: {
      enabled: true,
    },
  });
}

export const auth = createAuth();

export const getServerSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});
