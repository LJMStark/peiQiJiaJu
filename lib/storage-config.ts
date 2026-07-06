import type { AssetUploadKind } from '@/lib/dashboard-types';

export const MAX_IMAGE_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
export const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'] as const;

export const STORAGE_BUCKETS: Record<AssetUploadKind, string> = {
  furniture: 'furniture-assets',
  room: 'room-assets',
  generated: 'generated-assets',
};

export function getStorageBucket(kind: AssetUploadKind) {
  return STORAGE_BUCKETS[kind];
}

export function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
    throw new Error('Missing Cloudflare R2 environment variables. Please check your .env file.');
  }

  return { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl };
}
