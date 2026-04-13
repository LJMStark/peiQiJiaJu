import { badRequest, errorResponse, notFound } from '@/lib/server/api-utils';
import { requireVerifiedRequestSession } from '@/lib/auth-session';
import { findOwnedAssetDownload } from '@/lib/server/assets';
import { downloadStoredImageBytes } from '@/lib/server/storage';
import { createAssetDownloadRouteHandler } from '@/lib/server/asset-download-route-handler';

export const GET = createAssetDownloadRouteHandler({
  requireVerifiedRequestSession,
  findOwnedAssetDownload,
  downloadStoredImageBytes,
  badRequest,
  notFound,
  errorResponse,
});
