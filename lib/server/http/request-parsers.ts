import { createRouteError } from '@/lib/server/http/error-envelope';

export type JsonObject = Record<string, unknown>;

const INVALID_JSON_MESSAGE = '请求体格式不正确。';

export async function parseJsonObject(request: Request): Promise<JsonObject> {
  try {
    const body = (await request.json()) as unknown;

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw createRouteError({
        status: 400,
        code: 'INVALID_JSON',
        message: INVALID_JSON_MESSAGE,
      });
    }

    return body as JsonObject;
  } catch (error) {
    if (error instanceof Error && error.name === 'RouteError') {
      throw error;
    }

    throw createRouteError({
      status: 400,
      code: 'INVALID_JSON',
      message: INVALID_JSON_MESSAGE,
    });
  }
}

export function readString(body: JsonObject, key: string): string {
  return typeof body[key] === 'string' ? body[key] as string : '';
}

export function readTrimmedString(body: JsonObject, key: string): string {
  return readString(body, key).trim();
}

export function readOptionalTrimmedString(body: JsonObject, key: string): string | null {
  const value = readTrimmedString(body, key);
  return value || null;
}

export function readStringArray(body: JsonObject, key: string): string[] {
  const value = body[key];

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}
