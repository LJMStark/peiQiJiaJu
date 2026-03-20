export const REDEMPTION_CODE_LENGTH = 16;
export const REDEMPTION_CODE_GROUP_SIZE = 4;
export const REDEMPTION_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function normalizeRedemptionCodeInput(input: string): string {
  return input.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

export function formatRedemptionCode(input: string): string {
  const normalized = normalizeRedemptionCodeInput(input);
  const groups: string[] = [];

  for (let index = 0; index < normalized.length; index += REDEMPTION_CODE_GROUP_SIZE) {
    groups.push(normalized.slice(index, index + REDEMPTION_CODE_GROUP_SIZE));
  }

  return groups.join('-');
}

export function generateRedemptionCode(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(REDEMPTION_CODE_LENGTH));
  let code = '';

  for (const byte of randomBytes) {
    code += REDEMPTION_CODE_ALPHABET[byte % REDEMPTION_CODE_ALPHABET.length];
  }

  return code;
}
