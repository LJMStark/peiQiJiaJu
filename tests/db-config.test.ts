import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveDatabaseConnectionString, resolveDatabasePoolMax } from '../lib/db-config.ts';
import { resolveGenerationConcurrencyConnectionString } from '../lib/server/generation-concurrency.ts';

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

test('production queries can stay on DATABASE_URL while generation locks use DIRECT_URL', () => {
  assert.equal(
    resolveDatabaseConnectionString({
      nodeEnv: 'production',
      databaseUrl: 'postgres://pooler',
      directUrl: 'postgres://direct',
    }),
    'postgres://pooler'
  );

  assert.equal(
    resolveGenerationConcurrencyConnectionString({
      databaseUrl: 'postgres://pooler',
      directUrl: 'postgres://direct',
    }),
    'postgres://direct'
  );
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

test('resolveDatabasePoolMax falls back to the default when the env is missing or invalid', () => {
  assert.equal(resolveDatabasePoolMax(undefined), 5);
  assert.equal(resolveDatabasePoolMax(''), 5);
  assert.equal(resolveDatabasePoolMax('0'), 5);
  assert.equal(resolveDatabasePoolMax('8'), 8);
});
