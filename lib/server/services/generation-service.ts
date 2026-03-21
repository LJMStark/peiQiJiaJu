import { FREE_GENERATION_LIMIT, getGenerationAccessState } from '../../generation-access.ts';
import { createRouteError } from '../http/error-envelope.ts';

export type GenerateRoomRequest = {
  roomImageId: string;
  furnitureItemIds: string[];
  customInstruction: string | null;
};

export type GenerationServiceUser = {
  id: string;
  role?: string | null;
  vipExpiresAt?: Date | string | null;
};

export type OwnedRoomImageSource = {
  id: string;
  name: string;
  storagePath: string;
  mimeType: string;
  aspectRatio: string | null;
};

export type OwnedFurnitureItemSource = {
  id: string;
  name: string;
  category: string;
  storagePath: string;
  mimeType: string;
};

export type GenerationServiceDeps<THistoryItem = unknown> = {
  getGenerationCount: (userId: string) => Promise<number>;
  getOwnedRoomImage: (
    userId: string,
    roomImageId: string
  ) => Promise<OwnedRoomImageSource | null>;
  getOwnedFurnitureItems: (
    userId: string,
    furnitureItemIds: readonly string[]
  ) => Promise<OwnedFurnitureItemSource[]>;
  generateVisualization: (input: {
    roomImage: OwnedRoomImageSource;
    furnitureItems: readonly OwnedFurnitureItemSource[];
    customInstruction: string | null;
  }) => Promise<string>;
  createHistoryItem: (
    userId: string,
    input: {
      roomImageId: string;
      furnitureItemIds: readonly string[];
      generatedDataUrl: string;
      customInstruction: string | null;
    }
  ) => Promise<THistoryItem>;
};

type CountRow = {
  count: number;
};

type RoomSourceRow = {
  id: string;
  name: string;
  storage_path: string;
  mime_type: string;
  aspect_ratio: string | null;
};

type FurnitureSourceRow = {
  id: string;
  name: string;
  category: string;
  storage_path: string;
  mime_type: string;
};

function readTrimmedStringField(body: Record<string, unknown>, key: string): string {
  return typeof body[key] === 'string' ? body[key].trim() : '';
}

function readStringArrayField(body: Record<string, unknown>, key: string): string[] {
  const value = body[key];

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function getVipExpiredMessage() {
  return '您的会员套餐已到期，请联系客服咨询续费。';
}

function getFreeLimitReachedMessage() {
  return `免费用户生图额度已用完（共 ${FREE_GENERATION_LIMIT} 张），请联系客服咨询购买会员套餐。`;
}

export function parseGenerateRequest(body: Record<string, unknown>): GenerateRoomRequest {
  if ('furnitureFallbacks' in body || 'furnitureFallback' in body || 'storagePath' in body) {
    throw createRouteError({
      status: 400,
      code: 'UNSUPPORTED_FIELD',
      message: 'Client-managed storage pointers are no longer accepted.',
    });
  }

  const roomImageId = readTrimmedStringField(body, 'roomImageId');
  const furnitureItemIds = readStringArrayField(body, 'furnitureItemIds');
  const singleFurnitureItemId = readTrimmedStringField(body, 'furnitureItemId');
  const resolvedFurnitureItemIds = furnitureItemIds.length > 0
    ? furnitureItemIds
    : singleFurnitureItemId
      ? [singleFurnitureItemId]
      : [];

  if (!roomImageId || resolvedFurnitureItemIds.length === 0) {
    throw createRouteError({
      status: 400,
      code: 'INVALID_GENERATION_REQUEST',
      message: 'Room image and at least one furniture item are required.',
    });
  }

  const customInstruction = readTrimmedStringField(body, 'customInstruction');

  return {
    roomImageId,
    furnitureItemIds: resolvedFurnitureItemIds,
    customInstruction: customInstruction || null,
  };
}

export async function generateRoomVisualizationForUser<THistoryItem>(
  user: GenerationServiceUser,
  input: GenerateRoomRequest,
  deps: GenerationServiceDeps<THistoryItem>
) {
  const generationCount = await deps.getGenerationCount(user.id);
  const access = getGenerationAccessState({
    role: user.role,
    vipExpiresAt: user.vipExpiresAt,
    generationCount,
  });

  if (access.vipExpired) {
    throw createRouteError({
      status: 403,
      code: 'VIP_EXPIRED',
      message: getVipExpiredMessage(),
    });
  }

  if (access.freeLimitReached) {
    throw createRouteError({
      status: 403,
      code: 'FREE_LIMIT_REACHED',
      message: getFreeLimitReachedMessage(),
    });
  }

  const roomImage = await deps.getOwnedRoomImage(user.id, input.roomImageId);
  if (!roomImage) {
    throw createRouteError({
      status: 404,
      code: 'ROOM_IMAGE_NOT_FOUND',
      message: 'Room image not found.',
    });
  }

  const furnitureItems = await deps.getOwnedFurnitureItems(user.id, input.furnitureItemIds);
  const furnitureById = new Map(furnitureItems.map((item) => [item.id, item]));
  const orderedFurnitureItems = input.furnitureItemIds
    .map((itemId) => furnitureById.get(itemId))
    .filter((item): item is OwnedFurnitureItemSource => Boolean(item));

  if (orderedFurnitureItems.length !== input.furnitureItemIds.length) {
    throw createRouteError({
      status: 404,
      code: 'FURNITURE_ITEM_NOT_FOUND',
      message: 'Furniture item not found.',
    });
  }

  const generatedDataUrl = await deps.generateVisualization({
    roomImage,
    furnitureItems: orderedFurnitureItems,
    customInstruction: input.customInstruction,
  });

  return deps.createHistoryItem(user.id, {
    roomImageId: roomImage.id,
    furnitureItemIds: orderedFurnitureItems.map((item) => item.id),
    generatedDataUrl,
    customInstruction: input.customInstruction,
  });
}

async function createDefaultGenerationServiceDeps() {
  const [{ query }, { createHistoryItem }, { generateRoomVisualization }] = await Promise.all([
    import('../../db.ts'),
    import('../assets.ts'),
    import('../gemini.ts'),
  ]);

  const deps: GenerationServiceDeps = {
    async getGenerationCount(userId) {
      const countResult = await query<CountRow>(
        `SELECT COUNT(*)::int AS count FROM generation_history WHERE user_id = $1`,
        [userId]
      );

      return countResult.rows[0]?.count ?? 0;
    },
    async getOwnedRoomImage(userId, roomImageId) {
      const roomResult = await query<RoomSourceRow>(
        `select id, name, storage_path, mime_type, aspect_ratio
         from room_images
         where id = $1 and user_id = $2`,
        [roomImageId, userId]
      );

      const row = roomResult.rows[0];
      if (!row) {
        return null;
      }

      return {
        id: row.id,
        name: row.name,
        storagePath: row.storage_path,
        mimeType: row.mime_type,
        aspectRatio: row.aspect_ratio,
      };
    },
    async getOwnedFurnitureItems(userId, furnitureItemIds) {
      const furnitureResult = await query<FurnitureSourceRow>(
        `select id, name, category, storage_path, mime_type
         from furniture_items
         where user_id = $2 and id = any($1::text[])`,
        [furnitureItemIds, userId]
      );

      return furnitureResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
        category: row.category ?? '其他',
        storagePath: row.storage_path,
        mimeType: row.mime_type,
      }));
    },
    async generateVisualization(input) {
      const result = await generateRoomVisualization(input);
      return result.generatedDataUrl;
    },
    async createHistoryItem(userId, input) {
      return createHistoryItem(userId, {
        roomImageId: input.roomImageId,
        furnitureItemIds: [...input.furnitureItemIds],
        generatedDataUrl: input.generatedDataUrl,
        customInstruction: input.customInstruction,
      });
    },
  };

  return deps;
}

export async function generateRoomVisualizationForUserWithDefaults(
  user: GenerationServiceUser,
  input: GenerateRoomRequest
) {
  const deps = await createDefaultGenerationServiceDeps();
  return generateRoomVisualizationForUser(user, input, deps);
}
