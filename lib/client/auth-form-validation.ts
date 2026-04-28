const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getEmailValidationError(value: string): string | null {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return '请输入邮箱地址。';
  }

  if (!EMAIL_PATTERN.test(normalizedValue)) {
    return '邮箱格式不正确，请检查后重新输入。';
  }

  return null;
}
