export type ErrorEnvelope = {
  code: string;
  message: string;
  error: string;
};

export type ErrorResponseSpec = {
  status: number;
  body: ErrorEnvelope;
};

type RouteErrorInput = {
  status: number;
  code: string;
  message: string;
  expose?: boolean;
};

export class RouteError extends Error {
  readonly status: number;
  readonly code: string;
  readonly expose: boolean;

  constructor({ status, code, message, expose = true }: RouteErrorInput) {
    super(message);
    this.name = 'RouteError';
    this.status = status;
    this.code = code;
    this.expose = expose;
  }
}

export function createErrorEnvelope(code: string, message: string): ErrorEnvelope {
  return {
    code,
    message,
    error: message,
  };
}

export function createRouteError(input: RouteErrorInput) {
  return new RouteError(input);
}

function getDefaultErrorCode(status: number): string {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'UNPROCESSABLE_ENTITY';
    default:
      return 'INTERNAL_SERVER_ERROR';
  }
}

function createErrorResponseSpec(status: number, code: string, message: string): ErrorResponseSpec {
  return {
    status,
    body: createErrorEnvelope(code, message),
  };
}

function resolveRouteError(error: unknown, fallbackMessage: string, fallbackStatus: number) {
  if (error instanceof RouteError) {
    return {
      status: error.status,
      code: error.code,
      message: error.expose ? error.message : fallbackMessage,
    };
  }

  if (error instanceof Error) {
    const notFound = error.message.toLowerCase().includes('not found');
    if (notFound) {
      return {
        status: 404,
        code: 'NOT_FOUND',
        message: error.message,
      };
    }
  }

  if (fallbackStatus >= 500) {
    return {
      status: fallbackStatus,
      code: getDefaultErrorCode(fallbackStatus),
      message: fallbackMessage,
    };
  }

  return {
    status: fallbackStatus,
    code: getDefaultErrorCode(fallbackStatus),
    message: error instanceof Error ? error.message : fallbackMessage,
  };
}

export function badRequestSpec(message: string, code = 'BAD_REQUEST') {
  return createErrorResponseSpec(400, code, message);
}

export function unauthorizedSpec(message = '请先登录后再继续。', code = 'UNAUTHORIZED') {
  return createErrorResponseSpec(401, code, message);
}

export function forbiddenSpec(message = '请先完成邮箱验证后再继续。', code = 'FORBIDDEN') {
  return createErrorResponseSpec(403, code, message);
}

export function notFoundSpec(message = '资源不存在。', code = 'NOT_FOUND') {
  return createErrorResponseSpec(404, code, message);
}

export function conflictSpec(message: string, code = 'CONFLICT') {
  return createErrorResponseSpec(409, code, message);
}

export function unprocessableSpec(message: string, code = 'UNPROCESSABLE_ENTITY') {
  return createErrorResponseSpec(422, code, message);
}

export function internalErrorSpec(message: string, code = 'INTERNAL_SERVER_ERROR') {
  return createErrorResponseSpec(500, code, message);
}

export function errorResponseSpec(error: unknown, fallbackMessage: string, status = 400) {
  const resolved = resolveRouteError(error, fallbackMessage, status);
  return createErrorResponseSpec(resolved.status, resolved.code, resolved.message);
}

export function actionErrorResponseSpec(error: unknown, fallbackMessage: string, status = 400) {
  if (error instanceof Error && error.message === 'Unauthorized') {
    return unauthorizedSpec();
  }

  if (error instanceof Error && error.message === 'Forbidden') {
    return forbiddenSpec();
  }

  return errorResponseSpec(error, fallbackMessage, status);
}
