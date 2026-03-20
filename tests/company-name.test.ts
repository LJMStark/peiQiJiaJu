import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_COMPANY_NAME,
  MAX_COMPANY_NAME_LENGTH,
  getCompanyNameValidationError,
  getDisplayCompanyName,
  normalizeCompanyNameInput,
} from '../lib/company-name.ts';

test('normalizeCompanyNameInput trims surrounding whitespace', () => {
  assert.equal(normalizeCompanyNameInput('  某某家具有限公司  '), '某某家具有限公司');
});

test('getCompanyNameValidationError rejects blank company names', () => {
  assert.equal(getCompanyNameValidationError('   '), '请输入公司名称。');
});

test('getCompanyNameValidationError rejects company names that are too long', () => {
  assert.equal(
    getCompanyNameValidationError('a'.repeat(MAX_COMPANY_NAME_LENGTH + 1)),
    `公司名称不能超过 ${MAX_COMPANY_NAME_LENGTH} 个字符。`
  );
});

test('getDisplayCompanyName prefers the stored company name', () => {
  assert.equal(
    getDisplayCompanyName('  某某家具有限公司  ', 'hello@example.com'),
    '某某家具有限公司'
  );
});

test('getDisplayCompanyName falls back to the email prefix when name is empty', () => {
  assert.equal(getDisplayCompanyName(' ', 'hello@example.com'), 'hello');
});

test('getDisplayCompanyName falls back to the default brand name when email prefix is absent', () => {
  assert.equal(getDisplayCompanyName(null, '@example.com'), DEFAULT_COMPANY_NAME);
});
