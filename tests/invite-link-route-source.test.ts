import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const projectRoot = process.cwd();

async function readInviteRouteSource() {
  return readFile(path.join(projectRoot, 'app/i/[code]/route.ts'), 'utf8');
}

function extractBetween(source: string, startMarker: string, endMarker: string) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);

  assert.notEqual(start, -1, `missing ${startMarker}`);
  assert.notEqual(end, -1, `missing ${endMarker}`);

  return source.slice(start, end);
}

test('invite GET route does not claim referrals or write through a transaction', async () => {
  const source = await readInviteRouteSource();
  const getRouteSource = extractBetween(
    source,
    'export async function GET',
    'export async function POST'
  );

  assert.equal(getRouteSource.includes('claimInviteFromLink'), false);
  assert.equal(getRouteSource.includes('withInvitationTransaction'), false);
});

test('invite claims require an explicit POST form submission', async () => {
  const source = await readInviteRouteSource();
  const postRouteSource = source.slice(source.indexOf('export async function POST'));

  assert.equal(source.includes('method="post"'), true);
  assert.equal(postRouteSource.includes('claimInviteFromLink'), true);
  assert.equal(postRouteSource.includes('withInvitationTransaction'), true);
});
