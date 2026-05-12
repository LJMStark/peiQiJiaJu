import 'server-only';

import { query } from '@/lib/db';
import { RouteError } from '@/lib/server/http/error-envelope';

const MESSAGE_MAX_LENGTH = 2000;

export type GenerationFailurePayload = {
  userId: string | null;
  requestId: string | null;
  route: string;
  error: unknown;
  durationMs: number;
};

type ResolvedFailureFields = {
  statusCode: number | null;
  errorCode: string | null;
  errorMessage: string | null;
};

function resolveFailureFields(error: unknown): ResolvedFailureFields {
  if (error instanceof RouteError) {
    return {
      statusCode: error.status,
      errorCode: error.code,
      errorMessage: truncate(error.message),
    };
  }

  if (error instanceof Error) {
    return {
      statusCode: null,
      errorCode: error.name || null,
      errorMessage: truncate(error.message),
    };
  }

  if (error == null) {
    return { statusCode: null, errorCode: null, errorMessage: null };
  }

  try {
    return {
      statusCode: null,
      errorCode: null,
      errorMessage: truncate(String(error)),
    };
  } catch {
    return { statusCode: null, errorCode: null, errorMessage: null };
  }
}

function truncate(value: string | null | undefined): string | null {
  if (value == null) return null;
  if (value.length <= MESSAGE_MAX_LENGTH) return value;
  return value.slice(0, MESSAGE_MAX_LENGTH);
}

let warnedAboutMissingTable = false;

/**
 * 记录一次生成失败。函数永不抛出 —— 内部捕获所有错误并尽量保持沉默，
 * 以保证错误响应路径不会因为遥测层故障而二次失败。
 */
export async function recordGenerationFailure(
  payload: GenerationFailurePayload
): Promise<void> {
  const fields = resolveFailureFields(payload.error);

  try {
    await query(
      `
        INSERT INTO generation_failures (
          user_id,
          request_id,
          route,
          status_code,
          error_code,
          error_message,
          duration_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        payload.userId,
        payload.requestId,
        payload.route,
        fields.statusCode,
        fields.errorCode,
        fields.errorMessage,
        Number.isFinite(payload.durationMs) ? Math.max(0, Math.round(payload.durationMs)) : null,
      ]
    );
  } catch (err) {
    // 42P01 = undefined_table —— 表尚未迁移，静默忽略（每个进程仅警告一次）
    if (isUndefinedTableError(err)) {
      if (!warnedAboutMissingTable) {
        warnedAboutMissingTable = true;
        console.warn(
          '[generation-failure-log] generation_failures 表不存在，跳过失败采集。请运行 npm run generation-telemetry:migrate。'
        );
      }
      return;
    }

    console.error('[generation-failure-log] failed to persist failure log', err);
  }
}

function isUndefinedTableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as { code?: unknown }).code;
  return code === '42P01';
}
