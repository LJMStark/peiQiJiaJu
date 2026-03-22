type SiteBaseUrlInput = {
  appUrl?: string | null;
  nextPublicBaseUrl?: string | null;
  nodeEnv?: string | null;
  requestUrl?: string | null;
};

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export function getSiteBaseUrl(input: SiteBaseUrlInput = {}): string {
  const nextPublicBaseUrl = (input.nextPublicBaseUrl ?? process.env.NEXT_PUBLIC_BASE_URL ?? '').trim();
  const appUrl = (input.appUrl ?? process.env.APP_URL ?? '').trim();
  const configuredBaseUrl = nextPublicBaseUrl || appUrl;

  if (configuredBaseUrl) {
    return normalizeBaseUrl(configuredBaseUrl);
  }

  const nodeEnv = input.nodeEnv ?? process.env.NODE_ENV ?? 'development';

  if (nodeEnv === 'production') {
    throw new Error('SITE_BASE_URL_NOT_CONFIGURED');
  }

  if (input.requestUrl?.trim()) {
    return new URL(input.requestUrl).origin;
  }

  return 'http://localhost:3000';
}
