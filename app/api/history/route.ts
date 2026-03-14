import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth-session';
import { createHistoryItem, listHistoryItems } from '@/lib/server/assets';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return unauthorized();
  }

  try {
    const items = await listHistoryItems(session.user.id);
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load generation history.';
    return NextResponse.json({ error: message }, { status: 500 });
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
    const message = error instanceof Error ? error.message : 'Failed to save generation history.';
    const status = message.includes('not found') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
