import { NextResponse } from 'next/server';
import { redeemCode } from '@/app/actions/user';
import { actionErrorResponse, badRequest, readJsonBody } from '@/lib/server/api-utils';

export async function POST(request: Request) {
  const body = await readJsonBody<{ code?: unknown }>(request);
  if (!body) {
    return badRequest('请求体格式不正确。');
  }

  const code = typeof body.code === 'string' ? body.code : '';

  try {
    const result = await redeemCode(code);
    return NextResponse.json(result);
  } catch (error) {
    return actionErrorResponse(error, '兑换失败，请稍后重试。');
  }
}
