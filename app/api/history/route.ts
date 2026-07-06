import { NextResponse } from 'next/server';
import { requireVerifiedRequestSession } from '@/lib/auth-session';
import { badRequest, errorResponse } from '@/lib/server/api-utils';
import { listHistoryItems } from '@/lib/server/assets';
import { decodeHistoryCursor, parseHistoryPageSize } from '@/lib/server/history-pagination';

export async function GET(request: Request) {
  const authState = await requireVerifiedRequestSession(request);
  if (authState.response) {
    return authState.response;
  }

  try {
    const url = new URL(request.url);
    const cursor = decodeHistoryCursor(url.searchParams.get('cursor'));
    const limit = parseHistoryPageSize(url.searchParams.get('limit'));
    const page = await listHistoryItems(authState.session.user.id, { cursor, limit });
    return NextResponse.json(page);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('INVALID_HISTORY_')) {
      return badRequest('历史分页参数无效。', error.message);
    }

    return errorResponse(error, '加载历史记录失败。', 500);
  }
}
