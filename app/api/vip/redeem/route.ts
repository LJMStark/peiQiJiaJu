import { NextResponse } from 'next/server';
import { redeemCode } from '@/app/actions/user';
import { badRequest, readJsonBody } from '@/lib/server/api-utils';

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
    const message = error instanceof Error ? error.message : '兑换失败，请稍后重试。';
    const status = message === 'Unauthorized' ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
