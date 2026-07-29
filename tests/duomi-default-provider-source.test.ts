import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

async function source(path: string): Promise<string> {
  return readFile(new URL(path, root), 'utf8');
}

test('room generation and vibe enhancement default to Duomi', async () => {
  const [generationService, vibeService] = await Promise.all([
    source('lib/server/services/generation-service.ts'),
    source('lib/server/services/vibe-generation-service.ts'),
  ]);

  assert.match(generationService, /import\('\.\.\/duomi-image\.ts'\)/);
  assert.doesNotMatch(generationService, /import\('\.\.\/gemini\.ts'\)/);
  assert.match(vibeService, /import\('\.\.\/duomi-image\.ts'\)/);
  assert.doesNotMatch(vibeService, /import\('\.\.\/gemini\.ts'\)/);
});

test('furniture upload does not call Gemini while the channel is disabled', async () => {
  const catalogRoute = await source('app/api/catalog/route.ts');

  assert.doesNotMatch(catalogRoute, /server\/gemini|classifyFurnitureFile/);
});
