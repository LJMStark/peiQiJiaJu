import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth-session';
import { unauthorized, errorResponse } from '@/lib/server/api-utils';
import { deleteRoomImage } from '@/lib/server/assets';

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
    return errorResponse(error, 'Failed to delete room image.');
  }
}
