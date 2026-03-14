import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth-session';
import { unauthorized, badRequest, errorResponse } from '@/lib/server/api-utils';
import { createRoomImage, listRoomImages } from '@/lib/server/assets';

export async function GET(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return unauthorized();
  }

  try {
    const items = await listRoomImages(session.user.id);
    return NextResponse.json({ items });
  } catch (error) {
    return errorResponse(error, 'Failed to load room images.', 500);
  }
}

export async function POST(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return unauthorized();
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const name = formData.get('name');
  const aspectRatio = formData.get('aspectRatio');

  if (!(file instanceof File)) {
    return badRequest('Room image file is required.');
  }

  try {
    const item = await createRoomImage(session.user.id, {
      file,
      name: typeof name === 'string' ? name : null,
      aspectRatio: typeof aspectRatio === 'string' ? aspectRatio : null,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return errorResponse(error, 'Failed to upload room image.');
  }
}
