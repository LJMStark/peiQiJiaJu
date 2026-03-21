import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getCompanyNameValidationError, normalizeCompanyNameInput } from '@/lib/company-name';
import {
  INVITE_DASHBOARD_PATH,
  normalizeInviteCode,
  readInviteCodeFromCookieHeader,
  resolveSignupInviteCode,
} from '@/lib/invitations';
import { readJsonBody } from '@/lib/server/api-utils';
import { createInvitationRepository, withInvitationTransaction } from '@/lib/server/invitation-store';
import { recordInviteSignup } from '@/lib/server/invitation-service';
import { db } from '@/lib/db';

type SignUpRequestBody = {
  name?: unknown;
  email?: unknown;
  inviteCode?: unknown;
  password?: unknown;
  confirmPassword?: unknown;
};

function jsonError(message: string, code: string, status = 400) {
  return NextResponse.json({ code, message }, { status });
}

function readStringField(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

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
  const body = await readJsonBody<SignUpRequestBody>(request);
  if (!body) {
    return jsonError('请求体格式不正确。', 'INVALID_JSON');
  }

  const nameInput = readStringField(body.name);
  const emailInput = readStringField(body.email);
  const inviteCodeInput = readStringField(body.inviteCode);
  const password = readStringField(body.password);
  const confirmPassword = readStringField(body.confirmPassword);

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
  const requestedInviteCode = normalizeInviteCode(inviteCodeInput);
  const invitationRepo = createInvitationRepository(db);
  if (requestedInviteCode) {
    const inviteLink = await invitationRepo.getInviteLinkByCode(requestedInviteCode);
    if (!inviteLink || inviteLink.status !== 'active') {
      return jsonError('邀请码无效或已失效，请检查后重新输入。', 'INVALID_INVITE_CODE');
    }
  }

  const inviteCode = resolveSignupInviteCode({
    requestInviteCode: requestedInviteCode,
    cookieInviteCode: readInviteCodeFromCookieHeader(request.headers.get('cookie')),
  });
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
  const payload = parseJsonText<{ user?: { id?: string } }>(bodyText);

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

  return cloneTextResponse(bodyText, authResponse.status, responseHeaders);
}
