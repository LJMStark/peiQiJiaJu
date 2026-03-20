import { NextResponse } from 'next/server';
import { forceResetInviteLinkForUser } from '@/app/actions/admin';
import { actionErrorResponse, badRequest, readJsonBody } from '@/lib/server/api-utils';

export async function POST(request: Request) {
  const body = await readJsonBody<{ targetUserId?: unknown }>(request);
  if (!body) {
    return badRequest('请求体格式不正确。');
  }

  const targetUserId = typeof body.targetUserId === 'string'
    ? body.targetUserId.trim()
    : '';

  if (!targetUserId) {
    return badRequest('缺少目标用户 ID。');
  }

  try {
    const inviteLink = await forceResetInviteLinkForUser(targetUserId);
    return NextResponse.json(inviteLink);
  } catch (error) {
    return actionErrorResponse(error, '邀请链接重置失败。');
  }
}
