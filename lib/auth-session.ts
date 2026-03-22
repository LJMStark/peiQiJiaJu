import 'server-only';

import { auth, isSessionEmailVerified } from '@/lib/auth';
import { forbidden, unauthorized } from '@/lib/server/api-utils';

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
      response: unauthorized('请先登录后再继续。'),
    };
  }

  if (!isSessionEmailVerified(session)) {
    return {
      session: null,
      response: forbidden('请先完成邮箱验证后再继续。'),
    };
  }

  return {
    session,
    response: null,
  };
}
