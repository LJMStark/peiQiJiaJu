import { NextResponse } from 'next/server';
import { requireVerifiedRequestSession } from '@/lib/auth-session';
import { FREE_GENERATION_LIMIT, getGenerationAccessState } from '@/lib/generation-access';
import { badRequest, errorResponse } from '@/lib/server/api-utils';
import { generateRoomVisualization } from '@/lib/server/gemini';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

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
    return NextResponse.json(
      { error: '您的会员套餐已到期，请联系客服咨询续费。', code: 'VIP_EXPIRED' },
      { status: 403 }
    );
  }

  if (access.freeLimitReached) {
    return NextResponse.json(
      { error: `免费用户生图额度已用完（共 ${FREE_GENERATION_LIMIT} 张），请联系客服咨询购买会员套餐。`, code: 'FREE_LIMIT_REACHED' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const roomImageId = typeof body?.roomImageId === 'string' ? body.roomImageId.trim() : '';
    const furnitureItemIds = Array.isArray(body?.furnitureItemIds)
      ? body.furnitureItemIds
          .map((itemId: unknown) => (typeof itemId === 'string' ? itemId.trim() : ''))
          .filter(Boolean)
      : typeof body?.furnitureItemId === 'string' && body.furnitureItemId.trim()
        ? [body.furnitureItemId.trim()]
        : [];

    if (!roomImageId || furnitureItemIds.length === 0) {
      return badRequest('Room image and at least one furniture item are required.');
    }

    const item = await generateRoomVisualization(authState.session.user.id, {
      roomImageId,
      furnitureItemIds,
      customInstruction: typeof body?.customInstruction === 'string' ? body.customInstruction : null,
      furnitureFallbacks: Array.isArray(body?.furnitureFallbacks)
        ? body.furnitureFallbacks
            .filter(
              (item: unknown): item is {
                storagePath: string;
                mimeType: string;
                name?: string;
                category?: string;
              } =>
                Boolean(
                  item &&
                    typeof item === 'object' &&
                    typeof (item as { storagePath?: string }).storagePath === 'string' &&
                    typeof (item as { mimeType?: string }).mimeType === 'string'
                )
            )
            .map((item: {
              storagePath: string;
              mimeType: string;
              name?: string;
              category?: string;
            }) => ({
              storagePath: item.storagePath,
              mimeType: item.mimeType,
              name: item.name,
              category: item.category,
            }))
        : body?.furnitureFallback?.storagePath && body?.furnitureFallback?.mimeType
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
    return errorResponse(error, 'Failed to generate room visualization.');
  }
}
