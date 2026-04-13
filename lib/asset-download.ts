import type { AssetUploadKind, StoredImageAsset } from '@/lib/dashboard-types';

type DownloadableAsset = Pick<StoredImageAsset, 'storagePath'>;

function getStoragePathExtension(storagePath: string): string {
  const lastSegment = storagePath.split('/').pop() ?? '';
  const extension = lastSegment.match(/(\.[a-z0-9]+)$/i)?.[1];
  return extension?.toLowerCase() ?? '';
}

function stripDangerousFilenameCharacters(value: string): string {
  return value
    .replace(/[\/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function toAsciiFilename(fileName: string): string {
  const normalized = fileName
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]+/g, '')
    .replace(/["\\]/g, '')
    .trim();

  if (normalized && normalized !== getStoragePathExtension(fileName)) {
    return normalized;
  }

  const extension = getStoragePathExtension(fileName);
  return extension ? `image${extension}` : 'image';
}

export function buildAssetDownloadPath(
  kind: AssetUploadKind,
  asset: DownloadableAsset
): string {
  const searchParams = new URLSearchParams({
    kind,
    storagePath: asset.storagePath,
  });
  return `/api/assets/download?${searchParams.toString()}`;
}

export function getAssetDownloadFilename(name: string, storagePath: string): string {
  const safeName = stripDangerousFilenameCharacters(name) || 'image';
  const extension = getStoragePathExtension(storagePath);

  if (!extension || /\.[a-z0-9]+$/i.test(safeName)) {
    return safeName;
  }

  return `${safeName}${extension}`;
}

export function createAttachmentContentDisposition(fileName: string): string {
  const safeFileName = stripDangerousFilenameCharacters(fileName) || 'image';
  const asciiFileName = toAsciiFilename(safeFileName);
  const encodedFileName = encodeURIComponent(safeFileName);

  return `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodedFileName}`;
}
