import { NextResponse } from 'next/server';
import { requireVerifiedRequestSession } from '@/lib/auth-session';
import { generateInviteCode } from '@/lib/invitations';
import { getSiteBaseUrl } from '@/lib/site-url';
import { rotateInviteLinkForUser } from '@/lib/server/invitation-service';
import { withInvitationTransaction } from '@/lib/server/invitation-store';

export async function POST(request: Request) {
  const authState = await requireVerifiedRequestSession(request);
  if (authState.response) {
    return authState.response;
  }

  const baseUrl = getSiteBaseUrl({
    requestHeaders: request.headers,
    requestUrl: request.url,
  });

  try {
    const inviteLink = await withInvitationTransaction(async (repo) => {
      return rotateInviteLinkForUser({
        repo,
        targetUserId: authState.session.user.id,
        rotatedByUserId: authState.session.user.id,
        rotationReason: 'user_reset',
        baseUrl,
        now: new Date(),
        codeGenerator: generateInviteCode,
      });
    });

    return NextResponse.json({
      inviteUrl: inviteLink.inviteUrl,
      code: inviteLink.code,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reset invite link.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
