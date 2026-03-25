import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const projectRoot = process.cwd();

test('RoomEditor switches the room header action between continue-last-room and new-project without falling back to the first room image', async () => {
  const source = await readFile(path.join(projectRoot, 'components/RoomEditor.tsx'), 'utf8');

  assert.equal(
    source.includes('继续上次室内图'),
    true,
    'RoomEditor should expose a continue-last-room entry point'
  );

  assert.equal(
    source.includes('新建项目'),
    true,
    'RoomEditor should expose a new-project entry point once a room is active'
  );

  assert.match(
    source,
    /activeRoom\s*\?\s*\(/,
    'RoomEditor should branch the room header action when a room is active'
  );

  assert.match(
    source,
    /pendingRoomImage\s*\?\s*\(/,
    'RoomEditor should keep the continue-last-room action for the pending-room state'
  );

  assert.doesNotMatch(
    source,
    /\?\?\s*roomImages\[0\]\s*\?\?\s*null/,
    'RoomEditor should not auto-fallback to the first room image when no active room is selected'
  );
});

test('Welcome guide keeps the room-upload explanation concise', async () => {
  const source = await readFile(path.join(projectRoot, 'components/WelcomeGuideModal.tsx'), 'utf8');

  assert.equal(
    source.includes('上传客户的毛坯房或真实空间照片'),
    true,
    'WelcomeGuideModal should keep the room-upload step focused on the user action'
  );

  assert.equal(
    source.includes('默认会从空白工作台开始'),
    false,
    'WelcomeGuideModal should not explain internal empty-state behavior'
  );
});
