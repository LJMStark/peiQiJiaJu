import { NextResponse } from 'next/server';
import { requireVerifiedRequestSession } from '@/lib/auth-session';
import { errorResponse } from '@/lib/server/api-utils';
import { deleteRoomImage } from '@/lib/server/assets';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authState = await requireVerifiedRequestSession(request);
  if (authState.response) {
    return authState.response;
  }

  try {
    const { id } = await params;
    await deleteRoomImage(authState.session.user.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, 'Failed to delete room image.');
  }
}
