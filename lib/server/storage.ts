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

type SignedUrlBatchEntry = {
  path: string | null;
  signedUrl: string | null;
  error: string | null;
};

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
    width: processed.width,
    height: processed.height,
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

export async function downloadStoredImageBase64(kind: AssetUploadKind, storagePath: string) {
  const supabase = getSupabaseAdmin();
  const bucket = getStorageBucket(kind);
  const { data, error } = await supabase.storage.from(bucket).download(storagePath);

  if (error || !data) {
    throw new Error(`Failed to load source image: ${error?.message ?? 'Unknown storage error'}`);
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  return buffer.toString('base64');
}

export async function copyStoredImage(
  userId: string,
  kind: AssetUploadKind,
  input: { sourcePath: string; mimeType: string; fileName: string }
) {
  const bucket = getStorageBucket(kind);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.from(bucket).download(input.sourcePath);

  if (error || !data) {
    throw new Error(`Failed to copy stored image: ${error?.message ?? 'Unknown storage error'}`);
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  const storagePath = buildStoragePath(userId, kind, input.fileName, input.mimeType);
  const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, buffer, {
    cacheControl: '3600',
    contentType: input.mimeType,
    upsert: false,
  });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  return {
    bucket,
    storagePath,
    mimeType: input.mimeType,
    fileSize: buffer.byteLength,
  };
}

async function createSignedUrl(bucket: string, storagePath: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${error?.message ?? 'Unknown error'}`);
  }

  return data.signedUrl;
}

function getUniqueStoragePaths(storagePaths: readonly string[]) {
  const uniqueStoragePaths: string[] = [];
  const seenStoragePaths = new Set<string>();

  for (const storagePath of storagePaths) {
    const normalizedStoragePath = storagePath.trim();
    if (!normalizedStoragePath || seenStoragePaths.has(normalizedStoragePath)) {
      continue;
    }

    seenStoragePaths.add(normalizedStoragePath);
    uniqueStoragePaths.push(normalizedStoragePath);
  }

  return uniqueStoragePaths;
}

async function createSignedUrls(
  bucket: string,
  storagePaths: readonly string[]
): Promise<readonly SignedUrlBatchEntry[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls([...storagePaths], SIGNED_URL_TTL_SECONDS);

  if (error || !data) {
    throw new Error(`Failed to create signed URL: ${error?.message ?? 'Unknown error'}`);
  }

  return data.map((entry) => ({
    path: entry.path,
    signedUrl: entry.signedUrl,
    error: typeof entry.error === 'string' ? entry.error : entry.error ? String(entry.error) : null,
  }));
}

export async function createSignedImageUrl(kind: AssetUploadKind, storagePath: string): Promise<string> {
  return createSignedUrl(getStorageBucket(kind), storagePath);
}

export async function createSignedImageUrlMap(
  kind: AssetUploadKind,
  storagePaths: readonly string[]
): Promise<Map<string, string>> {
  const uniqueStoragePaths = getUniqueStoragePaths(storagePaths);
  if (uniqueStoragePaths.length === 0) {
    return new Map();
  }

  const signedEntries = await createSignedUrls(getStorageBucket(kind), uniqueStoragePaths);
  const expectedStoragePaths = new Set(uniqueStoragePaths);
  const signedUrlMap = new Map<string, string>();

  for (const entry of signedEntries) {
    const storagePath = entry.path?.trim();
    if (!storagePath || !expectedStoragePaths.has(storagePath)) {
      throw new Error('Failed to create signed URL: Batch response contained an unexpected storage path.');
    }

    if (entry.error) {
      throw new Error(`Failed to create signed URL: ${entry.error}`);
    }

    const signedUrl = entry.signedUrl?.trim();
    if (!signedUrl) {
      throw new Error(`Failed to create signed URL: Missing signed URL for ${storagePath}`);
    }

    signedUrlMap.set(storagePath, signedUrl);
  }

  for (const storagePath of uniqueStoragePaths) {
    if (!signedUrlMap.has(storagePath)) {
      throw new Error(`Failed to create signed URL: Missing signed URL for ${storagePath}`);
    }
  }

  return signedUrlMap;
}

export async function removeImage(kind: AssetUploadKind, storagePath: string) {
  const supabase = getSupabaseAdmin();
  const bucket = getStorageBucket(kind);
  const { error } = await supabase.storage.from(bucket).remove([storagePath]);

  if (error) {
    throw new Error(`Failed to delete storage object: ${error.message}`);
  }
}

export async function removeImages(kind: AssetUploadKind, storagePaths: readonly string[]) {
  if (storagePaths.length === 0) {
    return;
  }

  await Promise.all(storagePaths.map((storagePath) => removeImage(kind, storagePath).catch(() => undefined)));
}
