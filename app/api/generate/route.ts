import { NextResponse } from 'next/server';
import { requireVerifiedRequestSession } from '@/lib/auth-session';
import { badRequest, errorResponse } from '@/lib/server/api-utils';
import { generateRoomVisualization } from '@/lib/server/gemini';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const authState = await requireVerifiedRequestSession(request);
  if (authState.response) {
    return authState.response;
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
