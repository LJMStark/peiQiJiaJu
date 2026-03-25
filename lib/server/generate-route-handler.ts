import { randomUUID } from 'node:crypto';

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

type GenerateRouteRequest = {
  roomImageId: string;
  historyItemId: string | null;
  furnitureItemIds: string[];
  customInstruction: string | null;
};

type GenerateRouteDeps = {
  requireVerifiedRequestSession: (request: Request) => Promise<VerifiedSessionResult>;
  parseJsonObject: (request: Request) => Promise<Record<string, unknown>>;
  parseGenerateRequest: (body: Record<string, unknown>) => GenerateRouteRequest;
  generateRoomVisualizationForUserWithDefaults: (
    user: NonNullable<VerifiedSessionResult['session']>['user'],
    input: GenerateRouteRequest
  ) => Promise<unknown>;
  errorResponse: (error: unknown, fallbackMessage: string, status?: number) => Response;
};

export function createGenerateRouteHandler(
  deps: GenerateRouteDeps
) {
  return async function POST(request: Request) {
    const requestId = randomUUID();
    const startedAt = Date.now();
    let userId: string | null = null;

    try {
      console.info('[api/generate] start', { requestId });

      const authState = await deps.requireVerifiedRequestSession(request);
      if (authState.response) {
        console.info('[api/generate] auth rejected', {
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
      const input = deps.parseGenerateRequest(body);
      console.info('[api/generate] accepted', {
        requestId,
        userId,
        roomImageId: input.roomImageId,
        furnitureCount: input.furnitureItemIds.length,
        hasHistoryItemId: Boolean(input.historyItemId),
      });

      const item = await deps.generateRoomVisualizationForUserWithDefaults(
        {
          id: userId,
          role: authState.session.user.role,
          vipExpiresAt: authState.session.user.vipExpiresAt,
        },
        input
      );

      console.info('[api/generate] success', {
        requestId,
        userId,
        historyItemId: typeof item === 'object' && item !== null && 'id' in item ? item.id : null,
        durationMs: Date.now() - startedAt,
      });

      return Response.json({ item }, { status: 201 });
    } catch (error) {
      console.error(
        '[api/generate] failed',
        {
          requestId,
          userId,
          durationMs: Date.now() - startedAt,
        },
        error
      );
      return deps.errorResponse(error, 'Failed to generate room visualization.', 500);
    }
  };
}
