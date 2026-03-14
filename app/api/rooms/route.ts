import { NextResponse } from 'next/server';
import { requireVerifiedRequestSession } from '@/lib/auth-session';
import { badRequest, errorResponse } from '@/lib/server/api-utils';
import { createRoomImage, listRoomImages } from '@/lib/server/assets';

export async function GET(request: Request) {
  const authState = await requireVerifiedRequestSession(request);
  if (authState.response) {
    return authState.response;
  }

  try {
    const items = await listRoomImages(authState.session.user.id);
    return NextResponse.json({ items });
  } catch (error) {
    return errorResponse(error, 'Failed to load room images.', 500);
  }
}

export async function POST(request: Request) {
  const authState = await requireVerifiedRequestSession(request);
  if (authState.response) {
    return authState.response;
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const name = formData.get('name');
  const aspectRatio = formData.get('aspectRatio');

  if (!(file instanceof File)) {
    return badRequest('Room image file is required.');
  }

  try {
    const item = await createRoomImage(authState.session.user.id, {
      file,
      name: typeof name === 'string' ? name : null,
      aspectRatio: typeof aspectRatio === 'string' ? aspectRatio : null,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return errorResponse(error, 'Failed to upload room image.');
  }
}
