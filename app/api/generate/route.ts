import { NextResponse } from 'next/server';
import { requireVerifiedRequestSession } from '@/lib/auth-session';
import { FREE_GENERATION_LIMIT, getGenerationAccessState } from '@/lib/generation-access';
import { badRequest, errorResponse, forbidden } from '@/lib/server/api-utils';
import {
  parseJsonObject,
  readOptionalTrimmedString,
  readStringArray,
  readTrimmedString,
} from '@/lib/server/http/request-parsers';
import { generateRoomVisualization } from '@/lib/server/gemini';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

type FurnitureFallbackInput = {
  storagePath: string;
  mimeType: string;
  name?: string;
  category?: string;
};

function isFurnitureFallbackInput(value: unknown): value is FurnitureFallbackInput {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as { storagePath?: string }).storagePath === 'string' &&
      typeof (value as { mimeType?: string }).mimeType === 'string'
  );
}

export async function POST(request: Request) {
  const authState = await requireVerifiedRequestSession(request);
  if (authState.response) {
    return authState.response;
  }

  const userId = authState.session.user.id;
  const countResult = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM generation_history WHERE user_id = $1`,
    [userId]
  );
  const generationCount = countResult.rows[0]?.count ?? 0;
  const access = getGenerationAccessState({
    role: authState.session.user.role,
    vipExpiresAt: authState.session.user.vipExpiresAt,
    generationCount,
  });

  if (access.vipExpired) {
    return forbidden('您的会员套餐已到期，请联系客服咨询续费。', 'VIP_EXPIRED');
  }

  if (access.freeLimitReached) {
    return forbidden(
      `免费用户生图额度已用完（共 ${FREE_GENERATION_LIMIT} 张），请联系客服咨询购买会员套餐。`,
      'FREE_LIMIT_REACHED'
    );
  }

  try {
    const body = await parseJsonObject(request);
    const roomImageId = readTrimmedString(body, 'roomImageId');
    const furnitureItemIds = readStringArray(body, 'furnitureItemIds');
    const singleFurnitureItemId = readTrimmedString(body, 'furnitureItemId');
    const resolvedFurnitureItemIds = furnitureItemIds.length > 0
      ? furnitureItemIds
      : singleFurnitureItemId
        ? [singleFurnitureItemId]
        : [];

    if (!roomImageId || resolvedFurnitureItemIds.length === 0) {
      return badRequest(
        'Room image and at least one furniture item are required.',
        'INVALID_GENERATION_REQUEST'
      );
    }

    const item = await generateRoomVisualization(authState.session.user.id, {
      roomImageId,
      furnitureItemIds: resolvedFurnitureItemIds,
      customInstruction: readOptionalTrimmedString(body, 'customInstruction'),
      furnitureFallbacks: Array.isArray(body?.furnitureFallbacks)
        ? body.furnitureFallbacks
            .filter(
              (item: unknown): item is FurnitureFallbackInput => isFurnitureFallbackInput(item)
            )
            .map((item) => ({
              storagePath: item.storagePath,
              mimeType: item.mimeType,
              name: item.name,
              category: item.category,
            }))
        : isFurnitureFallbackInput(body.furnitureFallback)
          ? [{
              storagePath: body.furnitureFallback.storagePath,
              mimeType: body.furnitureFallback.mimeType,
              name: body.furnitureFallback.name,
              category: body.furnitureFallback.category,
            }]
          : undefined,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return errorResponse(error, 'Failed to generate room visualization.', 500);
  }
}
