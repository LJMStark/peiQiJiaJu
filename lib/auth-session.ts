import 'server-only';

import { auth } from '@/lib/auth';

export async function getRequestSession(request: Request) {
  return auth.api.getSession({
    headers: request.headers,
  });
}
