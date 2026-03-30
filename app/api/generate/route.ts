import { createGenerateRouteHandler } from '@/lib/server/generate-route-handler';
import { requireVerifiedRequestSession } from '@/lib/auth-session';
import { errorResponse } from '@/lib/server/api-utils';
import { parseJsonObject } from '@/lib/server/http/request-parsers';
import {
  generateRoomVisualizationForUserWithDefaults,
  parseGenerateRequest,
} from '@/lib/server/services/generation-service';

export const runtime = 'nodejs';

export const POST = createGenerateRouteHandler({
  requireVerifiedRequestSession,
  parseJsonObject,
  parseGenerateRequest,
  generateRoomVisualizationForUserWithDefaults,
  errorResponse,
});
