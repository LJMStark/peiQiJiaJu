import { createGenerateVibeRouteHandler } from '@/lib/server/generate-vibe-route-handler';
import { requireVerifiedRequestSession } from '@/lib/auth-session';
import { errorResponse } from '@/lib/server/api-utils';
import { parseJsonObject } from '@/lib/server/http/request-parsers';
import {
  generateRoomVibeForUserWithDefaults,
  parseGenerateVibeRequest,
} from '@/lib/server/services/vibe-generation-service';

export const runtime = 'nodejs';

export const POST = createGenerateVibeRouteHandler({
  requireVerifiedRequestSession,
  parseJsonObject,
  parseGenerateVibeRequest,
  generateRoomVibeForUserWithDefaults,
  errorResponse,
});
