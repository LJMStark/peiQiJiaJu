import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const projectRoot = '/Users/demon/vibecoding/peiqijiaju';

const CLIENT_COMPONENTS_THAT_TRIGGER_MUTATIONS = [
  'components/VipCenter.tsx',
  'components/admin/AdminInviteUserTable.tsx',
  'app/admin/codes/page.tsx',
];

test('client mutation components do not import app/actions directly', async () => {
  for (const relativePath of CLIENT_COMPONENTS_THAT_TRIGGER_MUTATIONS) {
    const filePath = path.join(projectRoot, relativePath);
    const source = await readFile(filePath, 'utf8');

    assert.equal(
      source.includes("@/app/actions"),
      false,
      `${relativePath} should call a stable API route instead of importing server actions directly`
    );
  }
});
