import { NextResponse } from 'next/server';
import { requireVerifiedRequestSession } from '@/lib/auth-session';
import { parseHistoryPageOptions } from '@/lib/history-page';
import { createRouteError, errorResponse } from '@/lib/server/api-utils';
import { listHistoryItems } from '@/lib/server/assets';

export async function GET(request: Request) {
  const authState = await requireVerifiedRequestSession(request);
  if (authState.response) {
    return authState.response;
  }

  try {
    const { limit, cursor, invalidCursor } = parseHistoryPageOptions(new URL(request.url).searchParams);
    if (invalidCursor) {
      throw createRouteError({
        status: 400,
        code: 'INVALID_HISTORY_CURSOR',
        message: '历史记录分页游标无效。',
      });
    }

    const historyPage = await listHistoryItems(authState.session.user.id, { limit, cursor });
    return NextResponse.json(historyPage);
  } catch (error) {
    return errorResponse(error, 'Failed to load generation history.', 500);
  }
}
