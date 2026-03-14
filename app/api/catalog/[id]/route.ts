import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth-session';
import { deleteFurnitureItem, updateFurnitureItem } from '@/lib/server/assets';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSession(request);
  if (!session) {
    return unauthorized();
  }

  try {
    const body = await request.json();
    const { id } = await params;
    const item = await updateFurnitureItem(session.user.id, id, {
      name: typeof body?.name === 'string' ? body.name : null,
      category: typeof body?.category === 'string' ? body.category : null,
    });

    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update furniture item.';
    const status = message.includes('not found') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSession(request);
  if (!session) {
    return unauthorized();
  }

  try {
    const { id } = await params;
    await deleteFurnitureItem(session.user.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete furniture item.';
    const status = message.includes('not found') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
