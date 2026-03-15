import { NextResponse } from 'next/server';
import { requireVerifiedRequestSession } from '@/lib/auth-session';
import { badRequest, errorResponse } from '@/lib/server/api-utils';
import { generateRoomVisualization } from '@/lib/server/gemini';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

const FREE_GENERATION_LIMIT = 10;

export async function POST(request: Request) {
  const authState = await requireVerifiedRequestSession(request);
  if (authState.response) {
    return authState.response;
  }

  const userId = authState.session.user.id;
  const vipExpiresAt = authState.session.user.vipExpiresAt
    ? new Date(authState.session.user.vipExpiresAt)
    : null;

  const now = new Date();
  const isVip = Boolean(vipExpiresAt && vipExpiresAt > now);

  if (!isVip) {
    const vipExpired = Boolean(vipExpiresAt && vipExpiresAt <= now);

    if (vipExpired) {
      return NextResponse.json(
        { error: '您的会员套餐已到期，请联系客服咨询续费。', code: 'VIP_EXPIRED' },
        { status: 403 }
      );
    }

    const countResult = await query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM generation_history WHERE user_id = $1`,
      [userId]
    );
    const generationCount = countResult.rows[0]?.count ?? 0;

    if (generationCount >= FREE_GENERATION_LIMIT) {
      return NextResponse.json(
        { error: '免费用户生图额度已用完（共 10 张），请联系客服咨询购买会员套餐。', code: 'FREE_LIMIT_REACHED' },
        { status: 403 }
      );
    }
  }

  try {
    const body = await request.json();
    const roomImageId = typeof body?.roomImageId === 'string' ? body.roomImageId.trim() : '';
    const furnitureItemId =
      typeof body?.furnitureItemId === 'string' ? body.furnitureItemId.trim() : '';

    if (!roomImageId || !furnitureItemId) {
      return badRequest('Room image and furniture item are required.');
    }

    const item = await generateRoomVisualization(authState.session.user.id, {
      roomImageId,
      furnitureItemId,
      customInstruction: typeof body?.customInstruction === 'string' ? body.customInstruction : null,
      roomFallback: body?.roomFallback?.storagePath && body?.roomFallback?.mimeType
        ? { storagePath: body.roomFallback.storagePath, mimeType: body.roomFallback.mimeType, name: body.roomFallback.name, aspectRatio: body.roomFallback.aspectRatio }
        : undefined,
      furnitureFallback: body?.furnitureFallback?.storagePath && body?.furnitureFallback?.mimeType
        ? { storagePath: body.furnitureFallback.storagePath, mimeType: body.furnitureFallback.mimeType, name: body.furnitureFallback.name, category: body.furnitureFallback.category }
        : undefined,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return errorResponse(error, 'Failed to generate room visualization.');
  }
}
