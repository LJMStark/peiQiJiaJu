import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function readSource(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('landing comparison uses one aligned before-and-after source', () => {
  const pageSource = readSource('components/landing/LandingPage.tsx');
  const compareSource = readSource('components/landing/BeforeAfterCompare.tsx');

  assert.match(pageSource, /beforeSrc="\/images\/auth-room-before-after\.png"/);
  assert.match(pageSource, /afterSrc="\/images\/auth-room-before-after\.png"/);
  assert.match(pageSource, /splitComposite/);
  assert.doesNotMatch(pageSource, /landing-room-empty\.jpg/);
  assert.match(compareSource, /transformOrigin: 'left center'/);
  assert.match(compareSource, /transformOrigin: 'right center'/);
});

test('landing comparison preserves vertical touch scrolling', () => {
  const source = readSource('components/landing/BeforeAfterCompare.tsx');

  assert.match(source, /touch-pan-y/);
  assert.doesNotMatch(source, /touch-none/);
  assert.match(source, /hasPointerCapture/);
});

test('landing copy describes visual preview instead of dimensional validation', () => {
  const source = readSource('components/landing/LandingPage.tsx');

  assert.doesNotMatch(source, /验证尺寸|保持真实比例/);
  assert.match(source, /预览.*比例.*风格.*摆放效果/);
});

test('landing feature list keeps list items as direct children', () => {
  const source = readSource('components/landing/LandingPage.tsx');
  const listStart = source.indexOf('<ul className="mt-10 border-t-2 border-ink/80">');
  const listEnd = source.indexOf('</ul>', listStart);
  const featureList = source.slice(listStart, listEnd);

  assert.ok(listStart >= 0 && listEnd > listStart);
  assert.match(featureList, /return \(\s*<li key=\{feature\.title\}>\s*<Reveal/);
  assert.doesNotMatch(featureList, /return \(\s*<Reveal/);
});
