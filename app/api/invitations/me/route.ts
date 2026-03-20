import { NextResponse } from 'next/server';
import { requireVerifiedRequestSession } from '@/lib/auth-session';
import { ensureInviteLinkForUser } from '@/lib/server/invitation-service';
import { getInviteCenterData, withInvitationTransaction } from '@/lib/server/invitation-store';
import { generateInviteCode } from '@/lib/invitations';

export async function GET(request: Request) {
  const authState = await requireVerifiedRequestSession(request);
  if (authState.response) {
    return authState.response;
  }

  const baseUrl = new URL(request.url).origin;

  try {
    const inviteLink = await withInvitationTransaction(async (repo) => {
      return ensureInviteLinkForUser({
        repo,
        inviterUserId: authState.session.user.id,
        baseUrl,
        now: new Date(),
        codeGenerator: generateInviteCode,
      });
    });
    const inviteCenter = await getInviteCenterData(authState.session.user.id);

    return NextResponse.json({
      inviteUrl: inviteLink.inviteUrl,
      code: inviteLink.code,
      stats: inviteCenter.stats,
      recentReferrals: inviteCenter.recentReferrals,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load invite center.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
