import type { AssetUploadKind } from '../dashboard-types.ts';
import {
  createAttachmentContentDisposition,
  getAssetDownloadFilename,
} from '../asset-download.ts';

type VerifiedSessionResult = {
  session: {
    user: {
      id: string;
    };
  } | null;
  response: Response | null;
};

type OwnedAssetDownload = {
  kind: AssetUploadKind;
  storagePath: string;
  name: string;
  mimeType: string;
};

type AssetDownloadRouteDeps = {
  requireVerifiedRequestSession: (request: Request) => Promise<VerifiedSessionResult>;
  findOwnedAssetDownload: (
    userId: string,
    input: { kind: AssetUploadKind; storagePath: string }
  ) => Promise<OwnedAssetDownload | null>;
  downloadStoredImageBytes: (kind: AssetUploadKind, storagePath: string) => Promise<Uint8Array>;
  badRequest: (message: string, code?: string) => Response;
  notFound: (message?: string, code?: string) => Response;
  errorResponse: (error: unknown, fallbackMessage: string, status?: number) => Response;
};

function isAssetUploadKind(value: string | null): value is AssetUploadKind {
  return value === 'furniture' || value === 'room' || value === 'generated';
}

export function createAssetDownloadRouteHandler(deps: AssetDownloadRouteDeps) {
  return async function GET(request: Request) {
    try {
      const authState = await deps.requireVerifiedRequestSession(request);
      if (authState.response) {
        return authState.response;
      }

      if (!authState.session) {
        throw new Error('Verified session is missing after auth guard.');
      }

      const { searchParams } = new URL(request.url);
      const kind = searchParams.get('kind');
      const storagePath = searchParams.get('storagePath')?.trim() ?? '';

      if (!isAssetUploadKind(kind)) {
        return deps.badRequest('下载资源类型无效。', 'INVALID_ASSET_KIND');
      }

      if (!storagePath) {
        return deps.badRequest('缺少下载图片路径。', 'MISSING_STORAGE_PATH');
      }

      const asset = await deps.findOwnedAssetDownload(authState.session.user.id, {
        kind,
        storagePath,
      });

      if (!asset) {
        return deps.notFound('下载图片不存在或无权访问。');
      }

      const bytes = await deps.downloadStoredImageBytes(asset.kind, asset.storagePath);
      const fileName = getAssetDownloadFilename(asset.name, asset.storagePath);
      const body = new Blob([new Uint8Array(bytes)], { type: asset.mimeType });

      return new Response(body, {
        status: 200,
        headers: {
          'content-type': asset.mimeType,
          'content-disposition': createAttachmentContentDisposition(fileName),
          'content-length': String(bytes.byteLength),
          'cache-control': 'private, no-store',
          'x-content-type-options': 'nosniff',
        },
      });
    } catch (error) {
      return deps.errorResponse(error, '下载图片失败，请稍后重试。', 500);
    }
  };
}
