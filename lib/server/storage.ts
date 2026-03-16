import 'server-only';

import { randomUUID } from 'node:crypto';
import { preprocessImage } from '@/lib/server/image-preprocess';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_UPLOAD_SIZE_BYTES,
  SIGNED_URL_TTL_SECONDS,
  getStorageBucket,
} from '@/lib/storage-config';
import type { AssetUploadKind } from '@/lib/dashboard-types';

function sanitizeSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getExtension(fileName: string, mimeType: string) {
  const explicitExtension = fileName.match(/\.([a-zA-Z0-9]+)$/)?.[0];
  if (explicitExtension) {
    return explicitExtension.toLowerCase();
  }

  switch (mimeType) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/heic':
      return '.heic';
    case 'image/heif':
      return '.heif';
    default:
      return '';
  }
}

export function assertImageFile(file: File) {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])) {
    throw new Error('Only JPG, PNG, and WebP images are supported.');
  }

  if (file.size <= 0) {
    throw new Error('Image file is empty.');
  }

  if (file.size > MAX_IMAGE_UPLOAD_SIZE_BYTES) {
    throw new Error('Image file exceeds the 10MB upload limit.');
  }
}

export function buildStoragePath(userId: string, kind: AssetUploadKind, fileName: string, mimeType: string) {
  const safeUserId = sanitizeSegment(userId) || 'anonymous';
  const safeKind = sanitizeSegment(kind);
  const extension = getExtension(fileName, mimeType);
  const fileStem = sanitizeSegment(fileName.replace(/\.[^.]+$/, '')) || kind;

  return `${safeUserId}/${safeKind}/${Date.now()}-${fileStem}-${randomUUID()}${extension}`;
}

export async function uploadImageFile(
  userId: string,
  kind: AssetUploadKind,
  file: File,
  fileName = file.name
) {
  assertImageFile(file);

  const rawBuffer = Buffer.from(await file.arrayBuffer());
  const processed = await preprocessImage(rawBuffer);

  const bucket = getStorageBucket(kind);
  const storagePath = buildStoragePath(userId, kind, fileName, processed.mimeType);
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(bucket).upload(storagePath, processed.buffer, {
    cacheControl: '3600',
    contentType: processed.mimeType,
    upsert: false,
  });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return {
    bucket,
    storagePath,
    mimeType: processed.mimeType,
    fileSize: processed.fileSize,
  };
}

export function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match?.[1] || !match[2]) {
    throw new Error('Invalid generated image payload.');
  }

  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], 'base64'),
    fileSize: Buffer.byteLength(match[2], 'base64'),
  };
}

export async function uploadGeneratedImage(userId: string, dataUrl: string, fileName: string) {
  const { mimeType, buffer, fileSize } = parseDataUrl(dataUrl);

  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])) {
    throw new Error('Generated image type is not supported.');
  }

  if (fileSize > MAX_IMAGE_UPLOAD_SIZE_BYTES) {
    throw new Error('Generated image exceeds the 10MB upload limit.');
  }

  const bucket = getStorageBucket('generated');
  const storagePath = buildStoragePath(userId, 'generated', fileName, mimeType);
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(bucket).upload(storagePath, buffer, {
    cacheControl: '3600',
    contentType: mimeType,
    upsert: false,
  });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return {
    bucket,
    storagePath,
    mimeType,
    fileSize,
  };
}

export async function createSignedImageUrl(kind: AssetUploadKind, storagePath: string) {
  const supabase = getSupabaseAdmin();
  const bucket = getStorageBucket(kind);
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${error?.message ?? 'Unknown error'}`);
  }

  return data.signedUrl;
}

export async function removeImage(kind: AssetUploadKind, storagePath: string) {
  const supabase = getSupabaseAdmin();
  const bucket = getStorageBucket(kind);
  const { error } = await supabase.storage.from(bucket).remove([storagePath]);

  if (error) {
    throw new Error(`Failed to delete storage object: ${error.message}`);
  }
}
