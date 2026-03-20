import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getCompanyNameValidationError, normalizeCompanyNameInput } from '@/lib/company-name';
import { INVITE_DASHBOARD_PATH, readInviteCodeFromCookieHeader } from '@/lib/invitations';
import { createInvitationRepository, withInvitationTransaction } from '@/lib/server/invitation-store';
import { recordInviteSignup } from '@/lib/server/invitation-service';
import { db } from '@/lib/db';

function jsonError(message: string, code: string, status = 400) {
  return NextResponse.json({ code, message }, { status });
}

function cloneAuthResponse(bodyText: string, status: number, headers: Headers) {
  return new NextResponse(bodyText, {
    status,
    headers,
  });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError('请求体格式不正确。', 'INVALID_JSON');
  }

  const nameInput = typeof (body as { name?: unknown })?.name === 'string' ? (body as { name: string }).name : '';
  const emailInput = typeof (body as { email?: unknown })?.email === 'string' ? (body as { email: string }).email : '';
  const password = typeof (body as { password?: unknown })?.password === 'string'
    ? (body as { password: string }).password
    : '';
  const confirmPassword = typeof (body as { confirmPassword?: unknown })?.confirmPassword === 'string'
    ? (body as { confirmPassword: string }).confirmPassword
    : '';

  const companyNameError = getCompanyNameValidationError(nameInput);
  if (companyNameError) {
    return jsonError(companyNameError, 'INVALID_COMPANY_NAME');
  }

  if (!emailInput.trim()) {
    return jsonError('请输入邮箱地址。', 'INVALID_EMAIL');
  }

  if (password.length < 8) {
    return jsonError('密码至少需要 8 位。', 'PASSWORD_TOO_SHORT');
  }

  if (password !== confirmPassword) {
    return jsonError('两次输入的密码不一致。', 'PASSWORD_MISMATCH');
  }

  const normalizedName = normalizeCompanyNameInput(nameInput);
  const normalizedEmail = emailInput.trim().toLowerCase();
  const inviteCode = readInviteCodeFromCookieHeader(request.headers.get('cookie'));
  const invitationRepo = createInvitationRepository(db);
  const existingUserBefore = await invitationRepo.getUserByEmail(normalizedEmail);

  const authResponse = await auth.api.signUpEmail({
    asResponse: true,
    body: {
      name: normalizedName,
      email: normalizedEmail,
      password,
      callbackURL: inviteCode ? INVITE_DASHBOARD_PATH : '/',
    },
    headers: request.headers,
  });

  const responseHeaders = new Headers(authResponse.headers);
  const bodyText = await authResponse.text();
  let payload: { user?: { id?: string } } | null = null;

  try {
    payload = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    payload = null;
  }

  if (authResponse.ok && inviteCode) {
    const actualUser = await invitationRepo.getUserByEmail(normalizedEmail);
    const actualUserId = actualUser?.id ?? null;
    const responseUserId = payload?.user?.id ?? null;

    if (!existingUserBefore && actualUserId && responseUserId === actualUserId) {
      try {
        await withInvitationTransaction(async (repo) => {
          await recordInviteSignup({
            repo,
            inviteCode,
            inviteeUserId: actualUserId,
            inviteeEmail: normalizedEmail,
            inviteeCompanyName: normalizedName,
            now: new Date(),
          });
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to record invitation signup.';
        console.error('[invitation] failed to record signup attribution:', message);
      }
    }
  }

  if (!authResponse.ok && !responseHeaders.has('content-type')) {
    responseHeaders.set('content-type', 'application/json');
  }

  return cloneAuthResponse(bodyText, authResponse.status, responseHeaders);
}
