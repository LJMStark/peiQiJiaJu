import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth-session';
import { unauthorized, errorResponse } from '@/lib/server/api-utils';
import { createHistoryItem, listHistoryItems } from '@/lib/server/assets';

export async function GET(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return unauthorized();
  }

  try {
    const items = await listHistoryItems(session.user.id);
    return NextResponse.json({ items });
  } catch (error) {
    return errorResponse(error, 'Failed to load generation history.', 500);
  }
}

export async function POST(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return unauthorized();
  }

  try {
    const body = await request.json();
    const item = await createHistoryItem(session.user.id, {
      roomImageId: String(body?.roomImageId ?? ''),
      furnitureItemId: String(body?.furnitureItemId ?? ''),
      generatedDataUrl: String(body?.generatedDataUrl ?? ''),
      customInstruction: typeof body?.customInstruction === 'string' ? body.customInstruction : null,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return errorResponse(error, 'Failed to save generation history.');
  }
}
