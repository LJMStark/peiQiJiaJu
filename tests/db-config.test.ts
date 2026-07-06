import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { resolveDatabasePoolMax } from '../lib/db-config.ts';
import { resolveGenerationConcurrencyConnectionString } from '../lib/server/generation-concurrency.ts';

const projectRoot = process.cwd();

test('main database pool keeps its DATABASE_URL fallback strategy local to lib/db', async () => {
  const source = await readFile(path.join(projectRoot, 'lib/db.ts'), 'utf8');

  assert.match(source, /process\.env\.DATABASE_URL \?\? process\.env\.DIRECT_URL/);
});

test('generation locks still prefer DIRECT_URL over the main pooler URL', () => {
  assert.equal(
    resolveGenerationConcurrencyConnectionString({
      databaseUrl: 'postgres://pooler',
      directUrl: 'postgres://direct',
    }),
    'postgres://direct'
  );
});

test('resolveDatabasePoolMax falls back to the default when the env is missing or invalid', () => {
  assert.equal(resolveDatabasePoolMax(undefined), 5);
  assert.equal(resolveDatabasePoolMax(''), 5);
  assert.equal(resolveDatabasePoolMax('0'), 5);
  assert.equal(resolveDatabasePoolMax('8'), 8);
});
