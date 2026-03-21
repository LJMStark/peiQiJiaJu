import { NextResponse } from 'next/server';
import { requireVerifiedRequestSession } from '@/lib/auth-session';
import { query } from '@/lib/db';
import { getGenerationAccessState } from '@/lib/generation-access';

export async function GET(request: Request) {
  const authState = await requireVerifiedRequestSession(request);
  if (authState.response) {
    return authState.response;
  }

  const userId = authState.session.user.id;

  const countResult = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM generation_history WHERE user_id = $1`,
    [userId]
  );

  const generationCount = countResult.rows[0]?.count ?? 0;
  const access = getGenerationAccessState({
    role: authState.session.user.role,
    vipExpiresAt: authState.session.user.vipExpiresAt,
    generationCount,
  });

  return NextResponse.json({
    generationCount,
    isVip: access.isVip,
    isAdmin: access.isAdmin,
    vipExpired: access.vipExpired,
    freeLimit: access.freeLimit,
    canGenerate: access.canGenerate,
  });
}
