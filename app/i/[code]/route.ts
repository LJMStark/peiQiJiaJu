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

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildInviteConfirmationHtml(input: {
  request: Request;
  inviteCode: string;
  userEmail: string;
  fallbackPath: string;
}) {
  const actionPath = `/i/${encodeURIComponent(input.inviteCode)}`;
  const fallbackUrl = buildSiteUrl(input.fallbackPath, {
    requestHeaders: input.request.headers,
    requestUrl: input.request.url,
  }).toString();

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>接受邀请 - 佩奇家具</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #18181b; background: #fafafa; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    main { width: min(100%, 420px); background: #fff; border: 1px solid #e4e4e7; border-radius: 16px; padding: 28px; box-shadow: 0 18px 45px rgb(24 24 27 / 0.08); }
    h1 { margin: 0; font-size: 24px; line-height: 1.25; letter-spacing: 0; }
    p { margin: 12px 0 0; color: #52525b; line-height: 1.7; }
    form { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 24px; }
    button, a { min-height: 44px; border-radius: 999px; padding: 0 18px; font: inherit; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; }
    button { border: 0; color: #fff; background: #18181b; cursor: pointer; }
    button:hover { background: #27272a; }
    a { color: #4f46e5; background: #eef2ff; }
  </style>
</head>
<body>
  <main>
    <h1>接受邀请</h1>
    <p>当前登录账号 ${escapeHtml(input.userEmail)} 将接受这条邀请。</p>
    <form method="post" action="${escapeHtml(actionPath)}">
      <button type="submit">接受邀请</button>
      <a href="${escapeHtml(fallbackUrl)}">暂不接受</a>
    </form>
  </main>
</body>
</html>`;
}

function confirmationResponse(input: {
  request: Request;
  inviteCode: string;
  userEmail: string;
  fallbackPath: string;
}) {
  const response = new NextResponse(buildInviteConfirmationHtml(input), {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
  setInviteCookie(response, input.inviteCode);
  return response;
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

  return confirmationResponse({
    request,
    inviteCode,
    userEmail: session.user.email,
    fallbackPath: getPostInviteTarget(session.user.email, session.user.emailVerified),
  });
}

export async function POST(
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
