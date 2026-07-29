import { NextResponse } from 'next/server';
import { requireVerifiedRequestSession } from '@/lib/auth-session';
import { FURNITURE_CATEGORIES } from '@/lib/dashboard-types';
import { badRequest, errorResponse } from '@/lib/server/api-utils';
import { createFurnitureItem, listFurnitureItems } from '@/lib/server/assets';

const UPLOAD_FURNITURE_CATEGORIES = new Set<string>(
  FURNITURE_CATEGORIES.filter((category) => category !== '全部')
);

function resolveFurnitureCategory(value: FormDataEntryValue | null) {
  return typeof value === 'string' && UPLOAD_FURNITURE_CATEGORIES.has(value)
    ? value
    : '其他';
}

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
    const item = await createFurnitureItem(authState.session.user.id, {
      file,
      name: typeof name === 'string' ? name : null,
      category: resolveFurnitureCategory(category),
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return errorResponse(error, 'Failed to upload furniture image.');
  }
}
