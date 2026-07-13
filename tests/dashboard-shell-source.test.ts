import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

async function readSource(path: string): Promise<string> {
  return readFile(new URL(path, root), 'utf8');
}

test('dashboard shell is split into focused components', async () => {
  const [header, navigation, content] = await Promise.all([
    readSource('components/dashboard/DashboardHeader.tsx'),
    readSource('components/dashboard/DashboardNavigation.tsx'),
    readSource('components/dashboard/DashboardContent.tsx'),
  ]);

  assert.match(header, /export function DashboardHeader/);
  assert.match(navigation, /export function DashboardNavigation/);
  assert.match(content, /export function DashboardContent/);
});

test('dashboard navigation keeps the three public entries and accessible tabs', async () => {
  const navigation = await readSource('components/dashboard/DashboardNavigation.tsx');

  for (const label of ['家具图册', '室内编辑器', '会员中心']) {
    assert.match(navigation, new RegExp(label));
  }

  assert.match(navigation, /aria-current/);
  assert.doesNotMatch(navigation, /邀请/);
});

test('mobile shell keeps a compact sticky tab row', async () => {
  const navigation = await readSource('components/dashboard/DashboardNavigation.tsx');

  assert.match(navigation, /h-12/);
  assert.match(navigation, /sticky/);
});
