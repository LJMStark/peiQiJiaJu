import { NextResponse } from 'next/server';
import { requireVerifiedRequestSession } from '@/lib/auth-session';
import { badRequest, errorResponse } from '@/lib/server/api-utils';
import {
  parseJsonObject,
  readOptionalTrimmedString,
  readStringArray,
  readTrimmedString,
} from '@/lib/server/http/request-parsers';
import { createHistoryItem, listHistoryItems } from '@/lib/server/assets';

export async function GET(request: Request) {
  const authState = await requireVerifiedRequestSession(request);
  if (authState.response) {
    return authState.response;
  }

  try {
    const items = await listHistoryItems(authState.session.user.id);
    return NextResponse.json({ items });
  } catch (error) {
    return errorResponse(error, 'Failed to load generation history.', 500);
  }
}

export async function POST(request: Request) {
  const authState = await requireVerifiedRequestSession(request);
  if (authState.response) {
    return authState.response;
  }

  try {
    const body = await parseJsonObject(request);
    const roomImageId = readTrimmedString(body, 'roomImageId');
    const generatedDataUrl = readTrimmedString(body, 'generatedDataUrl');
    const furnitureItemIds = readStringArray(body, 'furnitureItemIds');
    const singleFurnitureItemId = readTrimmedString(body, 'furnitureItemId');
    const resolvedFurnitureItemIds = furnitureItemIds.length > 0
      ? furnitureItemIds
      : singleFurnitureItemId
        ? [singleFurnitureItemId]
        : [];

    if (!roomImageId || !generatedDataUrl || resolvedFurnitureItemIds.length === 0) {
      return badRequest(
        'Room image, generated image, and at least one furniture item are required.',
        'INVALID_HISTORY_REQUEST'
      );
    }

    const item = await createHistoryItem(authState.session.user.id, {
      roomImageId,
      furnitureItemIds: resolvedFurnitureItemIds,
      generatedDataUrl,
      customInstruction: readOptionalTrimmedString(body, 'customInstruction'),
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return errorResponse(error, 'Failed to save generation history.', 500);
  }
}
