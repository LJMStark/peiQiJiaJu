import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth-session';
import { createFurnitureItem, listFurnitureItems } from '@/lib/server/assets';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return unauthorized();
  }

  try {
    const items = await listFurnitureItems(session.user.id);
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load catalog.';
    return NextResponse.json({ error: message }, { status: 500 });
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
  const category = formData.get('category');

  if (!(file instanceof File)) {
    return badRequest('Image file is required.');
  }

  try {
    const item = await createFurnitureItem(session.user.id, {
      file,
      name: typeof name === 'string' ? name : null,
      category: typeof category === 'string' ? category : null,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload furniture image.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
