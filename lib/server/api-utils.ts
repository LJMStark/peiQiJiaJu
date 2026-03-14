import 'server-only';

import { NextResponse } from 'next/server';

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function errorResponse(error: unknown, defaultMessage: string, status = 400) {
  const message = error instanceof Error ? error.message : defaultMessage;
  const resolvedStatus = message.includes('not found') ? 404 : status;
  return NextResponse.json({ error: message }, { status: resolvedStatus });
}
