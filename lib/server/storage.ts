import 'server-only';

import { randomUUID } from 'node:crypto';
import { preprocessImage } from '@/lib/server/image-preprocess';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_UPLOAD_SIZE_BYTES,
  getStorageBucket,
  getR2Config,
} from '@/lib/storage-config';
import type { AssetUploadKind } from '@/lib/dashboard-types';
import { getS3Client } from '@/lib/server/s3-client';
import { PutObjectCommand, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

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
  
  const s3 = getS3Client();
  const config = getR2Config();
  const objectKey = `${bucket}/${storagePath}`;

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: config.bucketName,
        Key: objectKey,
        Body: processed.buffer,
        ContentType: processed.mimeType,
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );
  } catch (error: any) {
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
  
  const s3 = getS3Client();
  const config = getR2Config();
  const objectKey = `${bucket}/${storagePath}`;

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: config.bucketName,
        Key: objectKey,
        Body: buffer,
        ContentType: mimeType,
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );
  } catch (error: any) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return {
    bucket,
    storagePath,
    mimeType,
    fileSize,
  };
}

export async function downloadStoredImageBytes(kind: AssetUploadKind, storagePath: string) {
  const bucket = getStorageBucket(kind);
  const s3 = getS3Client();
  const config = getR2Config();
  const objectKey = `${bucket}/${storagePath}`;

  try {
    const data = await s3.send(
      new GetObjectCommand({
        Bucket: config.bucketName,
        Key: objectKey,
      })
    );

    if (!data.Body) {
      throw new Error('Image body is empty');
    }

    return await data.Body.transformToByteArray();
  } catch (error: any) {
    throw new Error(`Failed to load source image: ${error.message}`);
  }
}

export async function downloadStoredImageBase64(kind: AssetUploadKind, storagePath: string) {
  const bytes = await downloadStoredImageBytes(kind, storagePath);
  return Buffer.from(bytes).toString('base64');
}

export async function copyStoredImage(
  userId: string,
  kind: AssetUploadKind,
  input: { sourcePath: string; mimeType: string; fileName: string }
) {
  const bucket = getStorageBucket(kind);
  const sourceKey = `${bucket}/${input.sourcePath}`;
  
  const storagePath = buildStoragePath(userId, kind, input.fileName, input.mimeType);
  const targetKey = `${bucket}/${storagePath}`;
  
  const s3 = getS3Client();
  const config = getR2Config();

  try {
    await s3.send(
      new CopyObjectCommand({
        Bucket: config.bucketName,
        CopySource: `${config.bucketName}/${sourceKey}`,
        Key: targetKey,
        ContentType: input.mimeType,
        MetadataDirective: 'REPLACE',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );
  } catch (error: any) {
    throw new Error(`Storage copy failed: ${error.message}`);
  }

  return {
    bucket,
    storagePath,
    mimeType: input.mimeType,
    fileSize: 0,
  };
}

export async function createSignedImageUrl(kind: AssetUploadKind, storagePath: string): Promise<string> {
  const bucket = getStorageBucket(kind);
  const config = getR2Config();
  
  // Custom Domain URLs on R2 look exactly like what the user configured: 
  // assets.peiqijiaju.xyz / bucketFolderPath / file
  return `${config.publicUrl.replace(/\/$/, '')}/${bucket}/${storagePath}`;
}

export async function removeImage(kind: AssetUploadKind, storagePath: string) {
  const bucket = getStorageBucket(kind);
  const s3 = getS3Client();
  const config = getR2Config();
  const objectKey = `${bucket}/${storagePath}`;

  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: config.bucketName,
        Key: objectKey,
      })
    );
  } catch (error: any) {
    throw new Error(`Failed to delete storage object: ${error.message}`);
  }
}

export async function removeImages(kind: AssetUploadKind, storagePaths: readonly string[]) {
  if (storagePaths.length === 0) {
    return;
  }

  await Promise.all(storagePaths.map((storagePath) => removeImage(kind, storagePath).catch(() => undefined)));
}
