export const DEFAULT_COMPANY_NAME = '佩奇家具';
export const MAX_COMPANY_NAME_LENGTH = 80;

export function normalizeCompanyNameInput(value: string) {
  return value.trim();
}

export function getCompanyNameValidationError(value: string) {
  const normalizedValue = normalizeCompanyNameInput(value);

  if (!normalizedValue) {
    return '请输入公司名称。';
  }

  if (normalizedValue.length > MAX_COMPANY_NAME_LENGTH) {
    return `公司名称不能超过 ${MAX_COMPANY_NAME_LENGTH} 个字符。`;
  }

  return null;
}

export function getDisplayCompanyName(
  name: string | null | undefined,
  email: string
) {
  const normalizedName = normalizeCompanyNameInput(name ?? '');

  if (normalizedName) {
    return normalizedName;
  }

  return email.split('@')[0] || DEFAULT_COMPANY_NAME;
}
