export const INVITE_CODE_LENGTH = 12;
export const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const INVITE_COOKIE_NAME = 'peiqi_invite';
export const INVITE_COOKIE_VERSION = 'v1';
export const INVITE_DASHBOARD_TAB = 'invite';
export const VIP_DASHBOARD_TAB = 'vip';
export const VIP_CENTER_DEFAULT_SECTION = 'overview';
export const VIP_CENTER_INVITE_SECTION = 'invite';
export const INVITE_LEGACY_DASHBOARD_PATH = `/?tab=${INVITE_DASHBOARD_TAB}`;
export const INVITE_DASHBOARD_PATH = `/?tab=${VIP_DASHBOARD_TAB}&section=${VIP_CENTER_INVITE_SECTION}`;

export const INVITE_ATTRIBUTION_WINDOW_DAYS = 7;
export const INVITE_LATE_CLAIM_WINDOW_HOURS = 24;

export function normalizeInviteCode(input: string): string {
  return input.replace(/[\s-]+/g, '').toUpperCase();
}

export function resolveSignupInviteCode(input: {
  requestInviteCode?: string | null | undefined;
  cookieInviteCode?: string | null | undefined;
}): string | null {
  const requestInviteCode = normalizeInviteCode(input.requestInviteCode ?? '');
  if (requestInviteCode) {
    return requestInviteCode;
  }

  const cookieInviteCode = normalizeInviteCode(input.cookieInviteCode ?? '');
  return cookieInviteCode || null;
}

export function generateInviteCode(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(INVITE_CODE_LENGTH));
  let code = '';

  for (const byte of randomBytes) {
    code += INVITE_CODE_ALPHABET[byte % INVITE_CODE_ALPHABET.length];
  }

  return code;
}

export function maskInviteeEmail(email: string): string {
  const trimmedEmail = email.trim().toLowerCase();
  const atIndex = trimmedEmail.indexOf('@');

  if (atIndex === -1) {
    return `${trimmedEmail.slice(0, 2) || trimmedEmail}***`;
  }

  const localPart = trimmedEmail.slice(0, atIndex);
  const domain = trimmedEmail.slice(atIndex + 1);

  return `${localPart.slice(0, 2) || localPart}***@${domain}`;
}

export function maskInviteeCompanyName(name: string | null | undefined): string {
  const trimmedName = name?.trim() ?? '';

  if (!trimmedName) {
    return '***';
  }

  return `${trimmedName.slice(0, 2)}***`;
}

export function buildInviteUrl(baseUrl: string, code: string): string {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBaseUrl}/i/${code}`;
}

export function encodeInviteCookie(payload: { code: string }) {
  return `${INVITE_COOKIE_VERSION}:${normalizeInviteCode(payload.code)}`;
}

export function decodeInviteCookie(value: string | null | undefined): { version: string; code: string } | null {
  if (!value) {
    return null;
  }

  const [version, rawCode] = value.split(':', 2);
  const code = normalizeInviteCode(rawCode ?? '');

  if (version !== INVITE_COOKIE_VERSION || !code) {
    return null;
  }

  return {
    version,
    code,
  };
}

export function readInviteCodeFromCookieHeader(cookieHeader: string | null | undefined) {
  if (!cookieHeader) {
    return null;
  }

  const rawCookieValue = cookieHeader
    .split(';')
    .map((segment) => segment.trim())
    .find((segment) => segment.startsWith(`${INVITE_COOKIE_NAME}=`))
    ?.slice(INVITE_COOKIE_NAME.length + 1);

  return decodeInviteCookie(rawCookieValue)?.code ?? null;
}

export function getInviteCookieMaxAgeSeconds() {
  return INVITE_ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60;
}
