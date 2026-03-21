import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getCompanyNameValidationError, normalizeCompanyNameInput } from '@/lib/company-name';
import { INVITE_DASHBOARD_PATH, readInviteCodeFromCookieHeader } from '@/lib/invitations';
import { createErrorEnvelope } from '@/lib/server/api-utils';
import { createInvitationRepository, withInvitationTransaction } from '@/lib/server/invitation-store';
import { recordInviteSignup } from '@/lib/server/invitation-service';
import { parseJsonObject, readString } from '@/lib/server/http/request-parsers';
import { db } from '@/lib/db';

function parseJsonText<T>(bodyText: string): T | null {
  try {
    return bodyText ? (JSON.parse(bodyText) as T) : null;
  } catch {
    return null;
  }
}

function cloneTextResponse(bodyText: string, status: number, headers: Headers) {
  return new NextResponse(bodyText, {
    status,
    headers,
  });
}

export async function POST(request: Request) {
  const body = await parseJsonObject(request);
  const nameInput = readString(body, 'name');
  const emailInput = readString(body, 'email');
  const password = readString(body, 'password');
  const confirmPassword = readString(body, 'confirmPassword');

  const companyNameError = getCompanyNameValidationError(nameInput);
  if (companyNameError) {
    return NextResponse.json(createErrorEnvelope('INVALID_COMPANY_NAME', companyNameError), { status: 400 });
  }

  if (!emailInput.trim()) {
    return NextResponse.json(createErrorEnvelope('INVALID_EMAIL', '请输入邮箱地址。'), { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(createErrorEnvelope('PASSWORD_TOO_SHORT', '密码至少需要 8 位。'), { status: 400 });
  }

  if (password !== confirmPassword) {
    return NextResponse.json(createErrorEnvelope('PASSWORD_MISMATCH', '两次输入的密码不一致。'), { status: 400 });
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
  const payload = parseJsonText<{ user?: { id?: string }; code?: string; message?: string; error?: string }>(bodyText);

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

  if (!authResponse.ok) {
    responseHeaders.set('content-type', 'application/json');
    responseHeaders.delete('content-length');

    return new NextResponse(
      JSON.stringify(
        createErrorEnvelope(
          typeof payload?.code === 'string' && payload.code.trim() ? payload.code : 'SIGNUP_FAILED',
          typeof payload?.message === 'string' && payload.message.trim()
            ? payload.message
            : typeof payload?.error === 'string' && payload.error.trim()
              ? payload.error
              : '注册失败，请稍后重试。'
        )
      ),
      {
        status: authResponse.status,
        headers: responseHeaders,
      }
    );
  }

  return cloneTextResponse(bodyText, authResponse.status, responseHeaders);
}
