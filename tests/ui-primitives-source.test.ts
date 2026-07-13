import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const primitiveFiles = [
  'components/ui/Button.tsx',
  'components/ui/Panel.tsx',
  'components/ui/EmptyState.tsx',
  'components/ui/StatusNotice.tsx',
  'components/ui/DialogFrame.tsx',
  'components/ui/Toolbar.tsx',
];

function readSource(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('shared UI primitives expose the planned component surface', () => {
  const sources = primitiveFiles.map(readSource);

  assert.match(sources[0], /export function Button/);
  assert.match(sources[1], /export function Panel/);
  assert.match(sources[2], /export function EmptyState/);
  assert.match(sources[3], /export function StatusNotice/);
  assert.match(sources[4], /export function DialogFrame/);
  assert.match(sources[5], /export function Toolbar/);
});

test('button variants and sizes stay within the design contract', () => {
  const source = readSource('components/ui/Button.tsx');

  for (const variant of ['primary', 'secondary', 'ghost', 'danger']) {
    assert.match(source, new RegExp(`${variant}:`));
  }
  for (const size of ['default', 'compact', 'icon']) {
    assert.match(source, new RegExp(`${size}:`));
  }
  assert.match(source, /type=\{type\}/);
  assert.match(source, /aria-label/);
});

test('dialog frame reuses the shared accessibility behavior', () => {
  const source = readSource('components/ui/DialogFrame.tsx');

  assert.match(source, /useDialogAccessibility/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /aria-labelledby/);
});

test('shared UI primitives do not reintroduce forbidden visual debt', () => {
  for (const path of primitiveFiles) {
    const source = readSource(path);
    assert.doesNotMatch(source, /gray-/);
    assert.doesNotMatch(source, /green-/);
    assert.doesNotMatch(source, /dark:/);
    assert.doesNotMatch(source, /rounded-\[/);
  }
});
