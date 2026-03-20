import { NextResponse } from 'next/server';
import { generateCodes } from '@/app/actions/admin';
import { actionErrorResponse, badRequest, readJsonBody } from '@/lib/server/api-utils';

export async function POST(request: Request) {
  const body = await readJsonBody<{ count?: unknown; days?: unknown }>(request);
  if (!body) {
    return badRequest('请求体格式不正确。');
  }

  const count = typeof body.count === 'number' ? body.count : NaN;
  const days = typeof body.days === 'number' ? body.days : NaN;

  try {
    const codes = await generateCodes(count, days);
    return NextResponse.json({ codes });
  } catch (error) {
    return actionErrorResponse(error, '生成兑换码失败。');
  }
}
