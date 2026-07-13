import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

async function source(path: string): Promise<string> {
  return readFile(new URL(path, root), 'utf8');
}

test('catalog uses a compact upload tool and reports partial results', async () => {
  const catalog = await source('components/Catalog.tsx');

  assert.match(catalog, /min-h-36/);
  assert.match(catalog, /成功上传/);
  assert.match(catalog, /重新上传失败项/);
  assert.match(catalog, /aria-label={`删除/);
});

test('vip center uses flat sections without the old orange hero treatment', async () => {
  const vip = await source('components/VipCenter.tsx');

  assert.doesNotMatch(vip, /from-amber-500/);
  assert.doesNotMatch(vip, /to-orange-400/);
  assert.match(vip, /会员状态/);
  assert.match(vip, /兑换会员/);
});

test('auth shell uses the synthetic before-and-after image only on desktop', async () => {
  const auth = await source('components/auth/AuthShell.tsx');

  assert.match(auth, /auth-room-before-after\.png/);
  assert.match(auth, /hidden lg:flex/);
  assert.doesNotMatch(auth, /customer-service-qr/);
  assert.match(auth, /lg:grid-cols-\[44fr_56fr\]/);
});
