import type { AssetUploadKind } from '@/lib/dashboard-types';

export const MAX_IMAGE_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
export const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const STORAGE_BUCKETS: Record<AssetUploadKind, string> = {
  furniture: 'furniture-assets',
  room: 'room-assets',
  generated: 'generated-assets',
};

function extractProjectRefFromConnection(connectionString: string) {
  try {
    const parsed = new URL(connectionString);

    const directMatch = parsed.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
    if (directMatch?.[1]) {
      return directMatch[1];
    }

    const poolerUsernameMatch = parsed.username.match(/^postgres\.([a-z0-9]+)$/i);
    if (poolerUsernameMatch?.[1]) {
      return poolerUsernameMatch[1];
    }
  } catch {
    return null;
  }

  return null;
}

export function resolveSupabaseProjectUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (configuredUrl) {
    return configuredUrl;
  }

  const candidates = [process.env.DIRECT_URL, process.env.DATABASE_URL];
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const projectRef = extractProjectRefFromConnection(candidate);
    if (projectRef) {
      return `https://${projectRef}.supabase.co`;
    }
  }

  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL is not set and could not be derived from DIRECT_URL or DATABASE_URL.'
  );
}

export function getStorageBucket(kind: AssetUploadKind) {
  return STORAGE_BUCKETS[kind];
}
