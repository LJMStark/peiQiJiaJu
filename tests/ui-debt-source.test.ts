import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const projectRoot = process.cwd();

async function readProjectFile(relativePath: string): Promise<string> {
  return readFile(path.join(projectRoot, relativePath), 'utf8');
}

test('room editor result panel does not reintroduce known loading and radius debt', async () => {
  const source = await readProjectFile('components/room-editor/RoomEditorResultPanel.tsx');

  assert.equal(source.includes("style={{ width: '75%' }}"), false);
  assert.equal(source.includes('rounded-[28px]'), false);
  assert.equal(source.includes('Ready To Generate'), false);
});

test('user-facing fallback copy stays Chinese and avoids obsolete storage vendor names', async () => {
  const sources = [
    await readProjectFile('app/error.tsx'),
    await readProjectFile('app/not-found.tsx'),
    await readProjectFile('components/Catalog.tsx'),
    await readProjectFile('components/Dashboard.tsx'),
  ].join('\n');

  for (const phrase of [
    'Something went wrong',
    'Try again',
    'Page Not Found',
    'Could not find requested resource',
    'Supabase Storage',
    'Failed to load catalog.',
    'Failed to delete furniture item.',
  ]) {
    assert.equal(sources.includes(phrase), false, `${phrase} should not appear in user-facing UI`);
  }
});

test('cleared UI files use zinc gray scale and emerald success colors', async () => {
  const uiFiles = [
    'app/admin/admin-shared.ts',
    'app/admin/codes/page.tsx',
    'app/admin/invitations/page.tsx',
    'app/admin/layout.tsx',
    'app/admin/page.tsx',
    'components/ContactQrCode.tsx',
    'components/VipCenter.tsx',
    'components/admin/AdminInviteUserTable.tsx',
    'components/admin/DashboardTrendChart.tsx',
  ];

  for (const relativePath of uiFiles) {
    const source = await readProjectFile(relativePath);
    assert.doesNotMatch(source, /gray-/, `${relativePath} should use zinc instead of gray`);
    assert.doesNotMatch(source, /green-/, `${relativePath} should use emerald instead of green`);
  }
});

test('handwritten dialogs share the accessibility hook and dialog semantics', async () => {
  const dialogFiles = [
    'app/admin/codes/page.tsx',
    'components/UsageLimitModal.tsx',
    'components/WelcomeGuideModal.tsx',
    'components/room-editor/FeedbackModal.tsx',
    'components/room-editor/FurniturePreviewModal.tsx',
    'components/room-editor/ImageLightbox.tsx',
    'components/room-editor/NewProjectConfirmModal.tsx',
  ];

  for (const relativePath of dialogFiles) {
    const source = await readProjectFile(relativePath);
    assert.match(source, /useDialogAccessibility/, `${relativePath} should wire Escape and focus handling`);
    assert.match(source, /role="dialog"/, `${relativePath} should expose dialog role`);
    assert.match(source, /aria-modal="true"/, `${relativePath} should mark the dialog as modal`);
  }

  const hookSource = await readProjectFile('components/use-dialog-accessibility.ts');
  assert.match(hookSource, /event\.key !== 'Escape'/);
  assert.match(hookSource, /focus\(\{ preventScroll: true \}\)/);
});
