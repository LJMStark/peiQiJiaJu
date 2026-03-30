import { NextResponse } from 'next/server';
import { requireVerifiedRequestSession } from '@/lib/auth-session';
import { errorResponse } from '@/lib/server/api-utils';
import { listHistoryItems } from '@/lib/server/assets';

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
