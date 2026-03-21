import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveDatabaseConnectionString } from '../lib/db-config.ts';

test('resolveDatabaseConnectionString prefers DIRECT_URL outside production', () => {
  const connectionString = resolveDatabaseConnectionString({
    nodeEnv: 'development',
    databaseUrl: 'postgres://pooler',
    directUrl: 'postgres://direct',
  });

  assert.equal(connectionString, 'postgres://direct');
});

test('resolveDatabaseConnectionString prefers DATABASE_URL in production', () => {
  const connectionString = resolveDatabaseConnectionString({
    nodeEnv: 'production',
    databaseUrl: 'postgres://pooler',
    directUrl: 'postgres://direct',
  });

  assert.equal(connectionString, 'postgres://pooler');
});

test('resolveDatabaseConnectionString falls back to whichever value is present', () => {
  assert.equal(
    resolveDatabaseConnectionString({
      nodeEnv: 'development',
      directUrl: 'postgres://direct',
    }),
    'postgres://direct'
  );

  assert.equal(
    resolveDatabaseConnectionString({
      nodeEnv: 'production',
      directUrl: 'postgres://direct',
    }),
    'postgres://direct'
  );

  assert.equal(
    resolveDatabaseConnectionString({
      nodeEnv: 'development',
      databaseUrl: 'postgres://pooler',
    }),
    'postgres://pooler'
  );
});
