import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const projectRoot = process.cwd();

async function fileExists(relativePath: string) {
  try {
    await access(path.join(projectRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

test('storage migration no longer manages Supabase Storage buckets', async () => {
  const source = await readFile(path.join(projectRoot, 'scripts/migrate-storage-assets.mjs'), 'utf8');

  assert.equal(source.includes('@supabase/supabase-js'), false);
  assert.equal(source.includes('supabase.storage'), false);
  assert.equal(source.includes('createBucket'), false);
  assert.equal(source.includes('SUPABASE_SERVICE_ROLE_KEY'), false);
});

test('legacy ESLint config is removed in favor of eslint.config.mjs', async () => {
  assert.equal(await fileExists('.eslintrc.json'), false);
  assert.equal(await fileExists('eslint.config.mjs'), true);
});
