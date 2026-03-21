import { after, NextResponse } from 'next/server';
import { requireVerifiedRequestSession } from '@/lib/auth-session';
import { errorResponse } from '@/lib/server/api-utils';
import { deleteFurnitureItem, updateFurnitureItem } from '@/lib/server/assets';
import { removeImages } from '@/lib/server/storage';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authState = await requireVerifiedRequestSession(request);
  if (authState.response) {
    return authState.response;
  }

  try {
    const body = await request.json();
    const { id } = await params;
    const item = await updateFurnitureItem(authState.session.user.id, id, {
      name: typeof body?.name === 'string' ? body.name : null,
      category: typeof body?.category === 'string' ? body.category : null,
    });

    return NextResponse.json({ item });
  } catch (error) {
    return errorResponse(error, 'Failed to update furniture item.');
  }
}

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
    const { storagePathsToDelete } = await deleteFurnitureItem(authState.session.user.id, id);

    if (storagePathsToDelete.length > 0) {
      after(() => removeImages('furniture', storagePathsToDelete));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, 'Failed to delete furniture item.');
  }
}
