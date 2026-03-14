import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth-session';
import { deleteRoomImage } from '@/lib/server/assets';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    await deleteRoomImage(session.user.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete room image.';
    const status = message.includes('not found') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
