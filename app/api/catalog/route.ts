import { NextResponse } from 'next/server';
import { requireVerifiedRequestSession } from '@/lib/auth-session';
import { badRequest, errorResponse } from '@/lib/server/api-utils';
import { createFurnitureItem, listFurnitureItems } from '@/lib/server/assets';
import { classifyFurnitureFile } from '@/lib/server/gemini';

export async function GET(request: Request) {
  const authState = await requireVerifiedRequestSession(request);
  if (authState.response) {
    return authState.response;
  }

  try {
    const items = await listFurnitureItems(authState.session.user.id);
    return NextResponse.json({ items });
  } catch (error) {
    return errorResponse(error, 'Failed to load catalog.', 500);
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
  const category = formData.get('category');

  if (!(file instanceof File)) {
    return badRequest('Image file is required.');
  }

  try {
    const resolvedCategory = await classifyFurnitureFile(
      file,
      typeof category === 'string' ? category : null
    );

    const item = await createFurnitureItem(authState.session.user.id, {
      file,
      name: typeof name === 'string' ? name : null,
      category: resolvedCategory,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return errorResponse(error, 'Failed to upload furniture image.');
  }
}
