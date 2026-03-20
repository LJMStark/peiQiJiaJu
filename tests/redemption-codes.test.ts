import assert from 'node:assert/strict';
import test from 'node:test';

const helperModuleUrl = new URL('../lib/redemption-codes.ts', import.meta.url);

async function loadHelpers() {
  return import(helperModuleUrl.href);
}

test('normalizeRedemptionCodeInput strips separators and uppercases user input', async () => {
  const helper = await loadHelpers();

  assert.equal(
    helper.normalizeRedemptionCodeInput(' abcd-efgh ijkl-mnop '),
    'ABCDEFGHIJKLMNOP'
  );
});

test('formatRedemptionCode groups normalized codes in blocks of four', async () => {
  const helper = await loadHelpers();

  assert.equal(helper.formatRedemptionCode('abcdefghijklmnop'), 'ABCD-EFGH-IJKL-MNOP');
  assert.equal(helper.formatRedemptionCode('abcd ef'), 'ABCD-EF');
});

test('generateRedemptionCode always returns 16 characters from the safe alphabet', async () => {
  const helper = await loadHelpers();
  const alphabet = new Set(helper.REDEMPTION_CODE_ALPHABET.split(''));

  for (let i = 0; i < 2_000; i += 1) {
    const code = helper.generateRedemptionCode();

    assert.equal(code.length, helper.REDEMPTION_CODE_LENGTH);
    assert.ok([...code].every((char) => alphabet.has(char)), `unexpected char in ${code}`);
  }
});
