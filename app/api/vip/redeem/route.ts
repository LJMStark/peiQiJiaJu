import { NextResponse } from 'next/server';
import { redeemCode } from '@/app/actions/user';
import { actionErrorResponse, badRequest } from '@/lib/server/api-utils';
import { parseJsonObject, readTrimmedString } from '@/lib/server/http/request-parsers';

export async function POST(request: Request) {
  const body = await parseJsonObject(request);
  const code = readTrimmedString(body, 'code');

  if (!code) {
    return badRequest('请输入兑换码。', 'INVALID_REDEMPTION_CODE');
  }

  try {
    const result = await redeemCode(code);
    return NextResponse.json(result);
  } catch (error) {
    return actionErrorResponse(error, '兑换失败，请稍后重试。');
  }
}
