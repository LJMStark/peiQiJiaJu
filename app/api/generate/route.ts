import { NextResponse } from 'next/server';
import { requireVerifiedRequestSession } from '@/lib/auth-session';
import { errorResponse } from '@/lib/server/api-utils';
import { parseJsonObject } from '@/lib/server/http/request-parsers';
import {
  generateRoomVisualizationForUserWithDefaults,
  parseGenerateRequest,
} from '@/lib/server/services/generation-service';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const authState = await requireVerifiedRequestSession(request);
  if (authState.response) {
    return authState.response;
  }

  try {
    const body = await parseJsonObject(request);
    const input = parseGenerateRequest(body);
    const item = await generateRoomVisualizationForUserWithDefaults(
      {
        id: authState.session.user.id,
        role: authState.session.user.role,
        vipExpiresAt: authState.session.user.vipExpiresAt,
      },
      input
    );

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return errorResponse(error, 'Failed to generate room visualization.', 500);
  }
}
