import { NextResponse } from 'next/server';
import { requireVerifiedRequestSession } from '@/lib/auth-session';
import { query } from '@/lib/db';

const FREE_GENERATION_LIMIT = 10;

export async function GET(request: Request) {
  const authState = await requireVerifiedRequestSession(request);
  if (authState.response) {
    return authState.response;
  }

  const userId = authState.session.user.id;
  const vipExpiresAt = authState.session.user.vipExpiresAt
    ? new Date(authState.session.user.vipExpiresAt)
    : null;

  const now = new Date();
  const isVip = Boolean(vipExpiresAt && vipExpiresAt > now);
  const vipExpired = Boolean(vipExpiresAt && vipExpiresAt <= now);

  const countResult = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM generation_history WHERE user_id = $1`,
    [userId]
  );

  const generationCount = countResult.rows[0]?.count ?? 0;

  return NextResponse.json({
    generationCount,
    isVip,
    vipExpired,
    freeLimit: FREE_GENERATION_LIMIT,
    canGenerate: isVip || generationCount < FREE_GENERATION_LIMIT,
  });
}
