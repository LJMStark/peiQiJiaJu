import assert from 'node:assert/strict';
import test from 'node:test';

import { getEmailValidationError } from '../lib/client/auth-form-validation.ts';

test('getEmailValidationError accepts normal business email addresses', () => {
  assert.equal(getEmailValidationError('name@company.com'), null);
  assert.equal(getEmailValidationError(' name+team@company.co '), null);
});

test('getEmailValidationError returns Chinese messages for empty and malformed email addresses', () => {
  assert.equal(getEmailValidationError(''), '请输入邮箱地址。');
  assert.equal(getEmailValidationError('bad-email'), '邮箱格式不正确，请检查后重新输入。');
  assert.equal(getEmailValidationError('name@company'), '邮箱格式不正确，请检查后重新输入。');
});
