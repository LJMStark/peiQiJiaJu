import { createRouteError } from './http/error-envelope.ts';

type GeminiApiErrorPayload = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

type GeminiApiErrorDetails = {
  status: number | null;
  message: string;
  providerStatus: string | null;
};

const GENERIC_GENERATION_RETRY_MESSAGE = '出错了，请重新生成。';
const MODEL_HIGH_DEMAND_MESSAGE = '当前模型负载太高，稍后再试。';

function readErrorStatus(error: unknown) {
  if (!error || typeof error !== 'object' || !('status' in error)) {
    return null;
  }

  const value = (error as { status?: unknown }).status;
  return typeof value === 'number' ? value : null;
}

function parseGeminiApiError(message: string): GeminiApiErrorDetails | null {
  try {
    const parsed = JSON.parse(message) as GeminiApiErrorPayload;
    const error = parsed.error;

    if (!error || typeof error.message !== 'string') {
      return null;
    }

    return {
      status: typeof error.code === 'number' ? error.code : null,
      message: error.message,
      providerStatus: typeof error.status === 'string' ? error.status : null,
    };
  } catch {
    return null;
  }
}

function getGeminiErrorDetails(error: unknown): GeminiApiErrorDetails | null {
  if (!(error instanceof Error)) {
    return null;
  }

  const parsed = parseGeminiApiError(error.message);
  if (parsed) {
    return parsed;
  }

  const message = error.message.trim();
  if (!message) {
    return null;
  }

  return {
    status: readErrorStatus(error),
    message,
    providerStatus: null,
  };
}

export function normalizeGeminiError(error: unknown) {
  const details = getGeminiErrorDetails(error);
  if (!details) {
    return null;
  }

  const normalizedMessage = details.message.toLowerCase();

  if (normalizedMessage.includes('gemini_api_key is not set')) {
    return createRouteError({
      status: 503,
      code: 'AI_CONFIG_INVALID',
      message: GENERIC_GENERATION_RETRY_MESSAGE,
    });
  }

  if (normalizedMessage.includes('user location is not supported for the api use')) {
    return createRouteError({
      status: 503,
      code: 'AI_REGION_UNSUPPORTED',
      message: GENERIC_GENERATION_RETRY_MESSAGE,
    });
  }

  if (normalizedMessage.includes('requested entity was not found')) {
    return createRouteError({
      status: 503,
      code: 'AI_MODEL_NOT_FOUND',
      message: GENERIC_GENERATION_RETRY_MESSAGE,
    });
  }

  if (
    details.status === 429
    || normalizedMessage.includes('rate limit')
    || normalizedMessage.includes('quota')
  ) {
    return createRouteError({
      status: 429,
      code: 'AI_RATE_LIMITED',
      message: GENERIC_GENERATION_RETRY_MESSAGE,
    });
  }

  if (
    details.providerStatus === 'UNAVAILABLE'
    || normalizedMessage.includes('currently experiencing high demand')
  ) {
    return createRouteError({
      status: 503,
      code: 'AI_TEMPORARILY_UNAVAILABLE',
      message: MODEL_HIGH_DEMAND_MESSAGE,
    });
  }

  if (normalizedMessage.includes('gemini did not return an image')) {
    return createRouteError({
      status: 502,
      code: 'AI_EMPTY_IMAGE_RESULT',
      message: GENERIC_GENERATION_RETRY_MESSAGE,
    });
  }

  return null;
}
