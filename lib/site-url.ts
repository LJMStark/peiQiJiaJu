type SiteBaseUrlInput = {
  appUrl?: string | null;
  nextPublicBaseUrl?: string | null;
  nodeEnv?: string | null;
  requestHeaders?: Pick<Headers, 'get'> | null;
  requestUrl?: string | null;
};

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function readFirstHeaderValue(value: string | null | undefined): string | null {
  const firstValue = value?.split(',')[0]?.trim() ?? '';
  return firstValue || null;
}

function stripQuotedHeaderValue(value: string): string {
  return value.replace(/^"|"$/g, '');
}

function buildOrigin(protocol: string, host: string, port: string | null = null): string {
  const normalizedProtocol = protocol.trim().toLowerCase() || 'https';
  const normalizedHost = host.trim();

  if (!normalizedHost) {
    throw new Error('SITE_BASE_URL_HOST_MISSING');
  }

  const needsPort =
    Boolean(port) &&
    !normalizedHost.includes(':') &&
    !(
      (normalizedProtocol === 'https' && port === '443') ||
      (normalizedProtocol === 'http' && port === '80')
    );

  return normalizeBaseUrl(
    `${normalizedProtocol}://${needsPort ? `${normalizedHost}:${port}` : normalizedHost}`
  );
}

function getForwardedOrigin(requestHeaders: Pick<Headers, 'get'> | null | undefined): string | null {
  if (!requestHeaders) {
    return null;
  }

  const forwardedHeader = readFirstHeaderValue(requestHeaders.get('forwarded'));
  if (forwardedHeader) {
    const forwardedParts = forwardedHeader.split(';');
    let forwardedProto: string | null = null;
    let forwardedHost: string | null = null;

    for (const part of forwardedParts) {
      const [rawKey, rawValue] = part.split('=', 2);
      const key = rawKey?.trim().toLowerCase();
      const value = stripQuotedHeaderValue(rawValue?.trim() ?? '');

      if (!key || !value) {
        continue;
      }

      if (key === 'proto') {
        forwardedProto = value;
      }

      if (key === 'host') {
        forwardedHost = value;
      }
    }

    if (forwardedHost) {
      return buildOrigin(forwardedProto ?? 'https', forwardedHost);
    }
  }

  const forwardedHost = readFirstHeaderValue(requestHeaders.get('x-forwarded-host'));
  if (!forwardedHost) {
    return null;
  }

  const forwardedProto = readFirstHeaderValue(requestHeaders.get('x-forwarded-proto')) ?? 'https';
  const forwardedPort = readFirstHeaderValue(requestHeaders.get('x-forwarded-port'));
  return buildOrigin(forwardedProto, forwardedHost, forwardedPort);
}

export function buildSiteUrl(pathname: string, input: SiteBaseUrlInput = {}): URL {
  return new URL(pathname, getSiteBaseUrl(input));
}

export function getSiteBaseUrl(input: SiteBaseUrlInput = {}): string {
  const nextPublicBaseUrl = (input.nextPublicBaseUrl ?? process.env.NEXT_PUBLIC_BASE_URL ?? '').trim();
  const appUrl = (input.appUrl ?? process.env.APP_URL ?? '').trim();
  const configuredBaseUrl = nextPublicBaseUrl || appUrl;

  if (configuredBaseUrl) {
    return normalizeBaseUrl(configuredBaseUrl);
  }

  const forwardedOrigin = getForwardedOrigin(input.requestHeaders);
  if (forwardedOrigin) {
    return forwardedOrigin;
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
