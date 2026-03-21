import { NextResponse } from 'next/server';
import {
  actionErrorResponseSpec,
  badRequestSpec,
  conflictSpec,
  createErrorEnvelope,
  createRouteError,
  errorResponseSpec,
  forbiddenSpec,
  internalErrorSpec,
  notFoundSpec,
  RouteError,
  unauthorizedSpec,
  unprocessableSpec,
} from '@/lib/server/http/error-envelope';
import { parseJsonObject } from '@/lib/server/http/request-parsers';

function toJsonResponse(spec: { status: number; body: { code: string; message: string; error: string } }) {
  return NextResponse.json(spec.body, { status: spec.status });
}

export async function readJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return (await parseJsonObject(request)) as T;
  } catch (error) {
    if (error instanceof RouteError && error.code === 'INVALID_JSON') {
      return null;
    }

    throw error;
  }
}

export {
  createErrorEnvelope,
  createRouteError,
};

export function badRequest(message: string, code = 'BAD_REQUEST') {
  return toJsonResponse(badRequestSpec(message, code));
}

export function unauthorized(message = '请先登录后再继续。', code = 'UNAUTHORIZED') {
  return toJsonResponse(unauthorizedSpec(message, code));
}

export function forbidden(message = '请先完成邮箱验证后再继续。', code = 'FORBIDDEN') {
  return toJsonResponse(forbiddenSpec(message, code));
}

export function notFound(message = '资源不存在。', code = 'NOT_FOUND') {
  return toJsonResponse(notFoundSpec(message, code));
}

export function conflict(message: string, code = 'CONFLICT') {
  return toJsonResponse(conflictSpec(message, code));
}

export function unprocessable(message: string, code = 'UNPROCESSABLE_ENTITY') {
  return toJsonResponse(unprocessableSpec(message, code));
}

export function internalError(message: string, code = 'INTERNAL_SERVER_ERROR') {
  return toJsonResponse(internalErrorSpec(message, code));
}

export function errorResponse(error: unknown, fallbackMessage: string, status = 400) {
  return toJsonResponse(errorResponseSpec(error, fallbackMessage, status));
}

export function actionErrorResponse(error: unknown, fallbackMessage: string, status = 400) {
  return toJsonResponse(actionErrorResponseSpec(error, fallbackMessage, status));
}
