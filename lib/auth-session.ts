import 'server-only';

import { NextResponse } from 'next/server';
import { auth, isSessionEmailVerified } from '@/lib/auth';

export async function getRequestSession(request: Request) {
  return auth.api.getSession({
    headers: request.headers,
  });
}

export async function requireVerifiedRequestSession(request: Request) {
  const session = await getRequestSession(request);

  if (!session) {
    return {
      session: null,
      response: NextResponse.json({ error: '请先登录后再继续。' }, { status: 401 }),
    };
  }

  if (!isSessionEmailVerified(session)) {
    return {
      session: null,
      response: NextResponse.json({ error: '请先完成邮箱验证后再继续。' }, { status: 403 }),
    };
  }

  return {
    session,
    response: null,
  };
}
