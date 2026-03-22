import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const projectRoot = process.cwd();

async function readProjectFile(relativePath: string): Promise<string> {
  return readFile(path.join(projectRoot, relativePath), 'utf8');
}

test('auth forms keep keyboard-accessible actions in the tab order', async () => {
  // Regression: QA-001 — auth page actions were removed from keyboard navigation with tabIndex={-1}
  // Found by /qa on 2026-03-22
  // Report: .gstack/qa-reports/qa-report-localhost-3000-2026-03-22.md
  const signInFormSource = await readProjectFile('components/auth/SignInForm.tsx');
  const signUpFormSource = await readProjectFile('components/auth/SignUpForm.tsx');
  const resetPasswordSource = await readProjectFile('app/(auth)/reset-password/page.tsx');

  assert.equal(
    signInFormSource.includes('href="/forgot-password" tabIndex={-1}'),
    false,
    'forgot password link should stay keyboard-focusable'
  );

  assert.equal(
    signInFormSource.includes('tabIndex={-1}'),
    false,
    'sign-in form should not remove password actions from tab order'
  );

  assert.equal(
    signUpFormSource.includes('tabIndex={-1}'),
    false,
    'sign-up form should not remove password actions from tab order'
  );

  assert.equal(
    resetPasswordSource.includes('tabIndex={-1}'),
    false,
    'reset password form should not remove password actions from tab order'
  );

  assert.equal(
    signInFormSource.includes("aria-label={showPassword ? '隐藏密码' : '显示密码'}"),
    true,
    'sign-in password visibility toggle should expose an accessible name'
  );

  assert.equal(
    signUpFormSource.includes("aria-label={showPassword ? '隐藏密码' : '显示密码'}"),
    true,
    'sign-up password visibility toggle should expose an accessible name'
  );

  assert.equal(
    signUpFormSource.includes("aria-label={showConfirmPassword ? '隐藏确认密码' : '显示确认密码'}"),
    true,
    'sign-up confirm password toggle should expose an accessible name'
  );
});
