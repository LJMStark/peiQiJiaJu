import { NextResponse } from 'next/server';
import { requireVerifiedRequestSession } from '@/lib/auth-session';
import { badRequest, errorResponse } from '@/lib/server/api-utils';
import { parseJsonObject, readTrimmedString } from '@/lib/server/http/request-parsers';
import { redeemMembershipCode } from '@/lib/server/services/membership-service';

export async function POST(request: Request) {
  const authState = await requireVerifiedRequestSession(request);
  if (authState.response) {
    return authState.response;
  }

  let body;
  try {
    body = await parseJsonObject(request);
  } catch (error) {
    return errorResponse(error, '请求体格式不正确。', 400);
  }

  const code = readTrimmedString(body, 'code');

  if (!code) {
    return badRequest('请输入兑换码。', 'INVALID_REDEMPTION_CODE');
  }

  try {
    const result = await redeemMembershipCode({
      userId: authState.session.user.id,
      code,
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, '兑换失败，请稍后重试。', 400);
  }
}
