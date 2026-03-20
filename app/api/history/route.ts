import { NextResponse } from 'next/server';
import { requireVerifiedRequestSession } from '@/lib/auth-session';
import { errorResponse } from '@/lib/server/api-utils';
import { createHistoryItem, listHistoryItems } from '@/lib/server/assets';

export async function GET(request: Request) {
  const authState = await requireVerifiedRequestSession(request);
  if (authState.response) {
    return authState.response;
  }

  try {
    const items = await listHistoryItems(authState.session.user.id);
    return NextResponse.json({ items });
  } catch (error) {
    return errorResponse(error, 'Failed to load generation history.', 500);
  }
}

export async function POST(request: Request) {
  const authState = await requireVerifiedRequestSession(request);
  if (authState.response) {
    return authState.response;
  }

  try {
    const body = await request.json();
    const furnitureItemIds = Array.isArray(body?.furnitureItemIds)
      ? body.furnitureItemIds
          .map((itemId: unknown) => (typeof itemId === 'string' ? itemId.trim() : ''))
          .filter(Boolean)
      : typeof body?.furnitureItemId === 'string' && body.furnitureItemId.trim()
        ? [body.furnitureItemId.trim()]
        : [];

    const item = await createHistoryItem(authState.session.user.id, {
      roomImageId: String(body?.roomImageId ?? ''),
      furnitureItemIds,
      generatedDataUrl: String(body?.generatedDataUrl ?? ''),
      customInstruction: typeof body?.customInstruction === 'string' ? body.customInstruction : null,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return errorResponse(error, 'Failed to save generation history.');
  }
}
