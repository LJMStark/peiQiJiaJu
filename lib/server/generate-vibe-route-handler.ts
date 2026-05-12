import { randomUUID } from 'node:crypto';

const RECORD_FAILURE_TIMEOUT_MS = 500;

type VerifiedSessionResult = {
  session: {
    user: {
      id: string;
      role?: string | null;
      vipExpiresAt?: Date | string | null;
    };
  } | null;
  response: Response | null;
};

type GenerateVibeRouteRequest = {
  historyItemId: string;
};

type RecordFailureInput = {
  userId: string | null;
  requestId: string;
  durationMs: number;
  error: unknown;
};

type GenerateVibeRouteDeps = {
  requireVerifiedRequestSession: (request: Request) => Promise<VerifiedSessionResult>;
  parseJsonObject: (request: Request) => Promise<Record<string, unknown>>;
  parseGenerateVibeRequest: (body: Record<string, unknown>) => GenerateVibeRouteRequest;
  generateRoomVibeForUserWithDefaults: (
    user: NonNullable<VerifiedSessionResult['session']>['user'],
    input: GenerateVibeRouteRequest
  ) => Promise<unknown>;
  errorResponse: (error: unknown, fallbackMessage: string, status?: number) => Response;
  recordFailure?: (input: RecordFailureInput) => Promise<void>;
};

export function createGenerateVibeRouteHandler(
  deps: GenerateVibeRouteDeps
) {
  return async function POST(request: Request) {
    const requestId = randomUUID();
    const startedAt = Date.now();
    let userId: string | null = null;

    try {
      console.info('[api/generate-vibe] start', { requestId });

      const authState = await deps.requireVerifiedRequestSession(request);
      if (authState.response) {
        console.info('[api/generate-vibe] auth rejected', {
          requestId,
          status: authState.response.status,
          durationMs: Date.now() - startedAt,
        });
        return authState.response;
      }

      if (!authState.session) {
        throw new Error('Verified session is missing after auth guard.');
      }

      userId = authState.session.user.id;
      const body = await deps.parseJsonObject(request);
      const input = deps.parseGenerateVibeRequest(body);
      console.info('[api/generate-vibe] accepted', {
        requestId,
        userId,
        historyItemId: input.historyItemId,
      });

      const item = await deps.generateRoomVibeForUserWithDefaults(
        {
          id: userId,
          role: authState.session.user.role,
          vipExpiresAt: authState.session.user.vipExpiresAt,
        },
        input
      );

      console.info('[api/generate-vibe] success', {
        requestId,
        userId,
        historyItemId: typeof item === 'object' && item !== null && 'id' in item ? item.id : null,
        durationMs: Date.now() - startedAt,
      });

      return Response.json({ item }, { status: 201 });
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      console.error(
        '[api/generate-vibe] failed',
        {
          requestId,
          userId,
          durationMs,
        },
        error
      );

      if (deps.recordFailure) {
        try {
          await Promise.race([
            deps.recordFailure({ userId, requestId, durationMs, error }),
            new Promise<void>((_, reject) =>
              setTimeout(
                () => reject(new Error('recordFailure timeout')),
                RECORD_FAILURE_TIMEOUT_MS
              )
            ),
          ]);
        } catch (logErr) {
          console.error('[api/generate-vibe] failure log threw or timed out', logErr);
        }
      }

      return deps.errorResponse(error, '出错了，请重新生成。', 500);
    }
  };
}
