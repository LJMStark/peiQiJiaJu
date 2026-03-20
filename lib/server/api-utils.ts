import 'server-only';

import { NextResponse } from 'next/server';

function getErrorMessage(error: unknown, defaultMessage: string): string {
  return error instanceof Error ? error.message : defaultMessage;
}

export async function readJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function errorResponse(error: unknown, defaultMessage: string, status = 400) {
  const message = getErrorMessage(error, defaultMessage);
  const resolvedStatus = message.includes('not found') ? 404 : status;
  return NextResponse.json({ error: message }, { status: resolvedStatus });
}

export function actionErrorResponse(error: unknown, defaultMessage: string, status = 400) {
  const message = getErrorMessage(error, defaultMessage);
  const resolvedStatus = message === 'Unauthorized' ? 401 : status;
  return NextResponse.json({ error: message }, { status: resolvedStatus });
}
