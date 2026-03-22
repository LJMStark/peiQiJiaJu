import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth-session';
import { buildSiteUrl } from '@/lib/site-url';
import {
  INVITE_DASHBOARD_PATH,
  INVITE_COOKIE_NAME,
  encodeInviteCookie,
  getInviteCookieMaxAgeSeconds,
  normalizeInviteCode,
} from '@/lib/invitations';
import { db } from '@/lib/db';
import { createInvitationRepository, withInvitationTransaction } from '@/lib/server/invitation-store';
import { claimInviteFromLink } from '@/lib/server/invitation-service';

function buildInviteCookieValue(code: string) {
  return encodeInviteCookie({ code });
}

function setInviteCookie(response: NextResponse, code: string) {
  response.cookies.set(INVITE_COOKIE_NAME, buildInviteCookieValue(code), {
    httpOnly: true,
    maxAge: getInviteCookieMaxAgeSeconds(),
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

function redirectResponse(request: Request, pathname: string) {
  return NextResponse.redirect(
    buildSiteUrl(pathname, {
      requestHeaders: request.headers,
      requestUrl: request.url,
    })
  );
}

function getPostInviteTarget(email: string, emailVerified: boolean) {
  if (emailVerified) {
    return INVITE_DASHBOARD_PATH;
  }

  return `/verify-email?email=${encodeURIComponent(email)}&callbackURL=${encodeURIComponent(INVITE_DASHBOARD_PATH)}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params;
  const inviteCode = normalizeInviteCode(rawCode);
  const invitationRepo = createInvitationRepository(db);
  const inviteLink = await invitationRepo.getInviteLinkByCode(inviteCode);

  if (!inviteLink || inviteLink.status !== 'active') {
    return redirectResponse(request, '/signup');
  }

  const session = await getRequestSession(request);

  if (!session) {
    const response = redirectResponse(request, `/signup?invited=1&code=${encodeURIComponent(inviteCode)}`);
    setInviteCookie(response, inviteCode);
    return response;
  }

  try {
    await withInvitationTransaction(async (repo) => {
      await claimInviteFromLink({
        repo,
        inviteCode,
        inviteeUserId: session.user.id,
        now: new Date(),
      });
    });

    const targetPath = getPostInviteTarget(session.user.email, session.user.emailVerified);
    const response = redirectResponse(request, targetPath);
    setInviteCookie(response, inviteCode);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'INVITE_UNAVAILABLE';
    const fallbackTarget = getPostInviteTarget(session.user.email, session.user.emailVerified);

    if (message === 'INVITEE_ALREADY_ATTRIBUTED') {
      return redirectResponse(request, fallbackTarget);
    }

    if (message === 'SELF_INVITE_NOT_ALLOWED') {
      return redirectResponse(request, fallbackTarget);
    }

    if (message === 'INVITE_LATE_CLAIM_WINDOW_EXPIRED') {
      return redirectResponse(request, fallbackTarget);
    }

    return redirectResponse(request, '/signup');
  }
}
