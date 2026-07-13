import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

async function source(path: string): Promise<string> {
  return readFile(new URL(path, root), 'utf8');
}

test('admin dashboard loads sections independently and uses the shared status palette', async () => {
  const dashboard = await source('app/admin/page.tsx');

  assert.match(dashboard, /Promise\.allSettled/);
  assert.match(dashboard, /部分数据加载失败/);
  assert.doesNotMatch(dashboard, /purple|violet|rose/);
});

test('invitation summary and user table load independently', async () => {
  const page = await source('app/admin/invitations/page.tsx');
  assert.match(page, /Promise\.allSettled/);
  assert.match(page, /usersError/);
});

test('dangerous invitation reset names the affected user in a confirmation dialog', async () => {
  const table = await source('components/admin/AdminInviteUserTable.tsx');

  assert.match(table, /DialogFrame/);
  assert.match(table, /确定要重置/);
  assert.match(table, /getUserDisplayName\(resetTarget\)/);
  assert.doesNotMatch(table, /rose/);
});
