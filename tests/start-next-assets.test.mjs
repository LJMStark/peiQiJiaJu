import assert from 'node:assert/strict';
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

const helperModuleUrl = new URL('../scripts/start-next-assets.mjs', import.meta.url);

async function loadHelper() {
  return import(helperModuleUrl).catch(() => null);
}

async function createFixtureRoot() {
  return mkdtemp(path.join(tmpdir(), 'start-next-assets-'));
}

test('syncStandaloneAssets copies build and public assets into standalone output', async () => {
  const helper = await loadHelper();

  assert.ok(helper?.syncStandaloneAssets, 'syncStandaloneAssets should be exported');

  const root = await createFixtureRoot();

  try {
    await mkdir(path.join(root, '.next', 'standalone'), { recursive: true });
    await mkdir(path.join(root, '.next', 'static', 'chunks'), { recursive: true });
    await mkdir(path.join(root, 'public'), { recursive: true });

    await writeFile(path.join(root, '.next', 'static', 'chunks', 'app.js'), 'chunk-data');
    await writeFile(path.join(root, 'public', 'customer-service-qr.png'), 'png-data');

    await helper.syncStandaloneAssets(root);

    assert.equal(
      await readFile(path.join(root, '.next', 'standalone', '.next', 'static', 'chunks', 'app.js'), 'utf8'),
      'chunk-data'
    );
    assert.equal(
      await readFile(path.join(root, '.next', 'standalone', 'public', 'customer-service-qr.png'), 'utf8'),
      'png-data'
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('syncStandaloneAssets replaces stale standalone assets', async () => {
  const helper = await loadHelper();

  assert.ok(helper?.syncStandaloneAssets, 'syncStandaloneAssets should be exported');

  const root = await createFixtureRoot();

  try {
    await mkdir(path.join(root, '.next', 'standalone', '.next', 'static', 'chunks'), {
      recursive: true,
    });
    await mkdir(path.join(root, '.next', 'static', 'chunks'), { recursive: true });
    await mkdir(path.join(root, '.next', 'standalone', 'public'), { recursive: true });
    await mkdir(path.join(root, 'public'), { recursive: true });

    await writeFile(path.join(root, '.next', 'static', 'chunks', 'app.js'), 'fresh-chunk');
    await writeFile(path.join(root, 'public', 'customer-service-qr.png'), 'fresh-png');
    await writeFile(
      path.join(root, '.next', 'standalone', '.next', 'static', 'chunks', 'obsolete.js'),
      'obsolete'
    );
    await writeFile(path.join(root, '.next', 'standalone', 'public', 'obsolete.txt'), 'obsolete');

    await helper.syncStandaloneAssets(root);

    assert.equal(
      await readFile(path.join(root, '.next', 'standalone', '.next', 'static', 'chunks', 'app.js'), 'utf8'),
      'fresh-chunk'
    );
    await assert.rejects(() =>
      access(path.join(root, '.next', 'standalone', '.next', 'static', 'chunks', 'obsolete.js'))
    );
    await assert.rejects(() =>
      access(path.join(root, '.next', 'standalone', 'public', 'obsolete.txt'))
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
