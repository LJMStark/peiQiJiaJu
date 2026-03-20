import { NextResponse } from 'next/server';
import { generateCodes } from '@/app/actions/admin';
import { badRequest, readJsonBody } from '@/lib/server/api-utils';

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
    const message = error instanceof Error ? error.message : '生成兑换码失败。';
    const status = message === 'Unauthorized' ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
