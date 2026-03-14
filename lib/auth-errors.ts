const ERROR_MESSAGES: Readonly<Record<string, string>> = {
  USER_ALREADY_EXISTS: '该邮箱已被注册，请直接登录或使用其他邮箱。',
  INVALID_EMAIL_OR_PASSWORD: '邮箱或密码错误，请重新输入。',
  USER_NOT_FOUND: '该邮箱尚未注册，请先注册账号。',
  EMAIL_NOT_VERIFIED: '邮箱尚未验证，请查收验证邮件并完成验证。',
  INVALID_PASSWORD: '密码错误，请重新输入。',
  TOO_MANY_REQUESTS: '操作过于频繁，请稍后再试。',
  EMAIL_CAN_NOT_BE_UPDATED: '邮箱地址无法修改。',
  CREDENTIAL_ACCOUNT_NOT_FOUND: '未找到对应账号，请检查邮箱地址。',
  FAILED_TO_SEND_VERIFICATION_EMAIL: '验证邮件发送失败，请稍后重试。',
  INVALID_EMAIL: '邮箱格式不正确，请检查后重新输入。',
  PASSWORD_TOO_SHORT: '密码至少需要 8 位。',
  PASSWORD_TOO_LONG: '密码长度不能超过 128 位。',
};

export function getAuthErrorMessage(code: string | undefined, fallback?: string): string {
  if (code && code in ERROR_MESSAGES) {
    return ERROR_MESSAGES[code];
  }

  return fallback ?? '操作失败，请稍后重试。';
}
