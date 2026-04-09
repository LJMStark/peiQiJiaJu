import { FREE_GENERATION_LIMIT, getGenerationAccessState } from '../../generation-access.ts';
import { normalizeHistoryFurnitureSnapshots } from '../../room-visualization.ts';
import { createGenerationHistorySchemaError } from '../generation-history-schema.ts';
import { createRouteError } from '../http/error-envelope.ts';

export type GenerateVibeRequest = {
  historyItemId: string;
};

export type GenerationServiceUser = {
  id: string;
  role?: string | null;
  vipExpiresAt?: Date | string | null;
};

type HistoryRoomFallback = {
  name: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  aspectRatio: string | null;
};

type HistoryFurnitureFallback = {
  name: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  category?: string;
};

export type OwnedHistoryVibeSource = {
  historyItemId: string;
  roomImageId: string | null;
  roomFallback: HistoryRoomFallback;
  furnitureItemIds: string[];
  furnitureFallbacks: HistoryFurnitureFallback[];
  generatedImage: {
    storagePath: string;
    mimeType: string;
    aspectRatio: string | null;
  };
};

export type GenerationVibeServiceDeps<THistoryItem = unknown> = {
  runWithConcurrencyGuard?: <T>(
    userId: string,
    action: () => Promise<T>
  ) => Promise<T>;
  getGenerationCount: (userId: string) => Promise<number>;
  getOwnedHistoryVibeSource: (
    userId: string,
    historyItemId: string
  ) => Promise<OwnedHistoryVibeSource | null>;
  generateVibe: (input: {
    generatedImage: {
      storagePath: string;
      mimeType: string;
      aspectRatio: string | null;
    };
  }) => Promise<string>;
  createHistoryItem: (
    userId: string,
    input: {
      roomImageId: string | null;
      roomFallback: HistoryRoomFallback;
      furnitureItemIds: readonly string[];
      furnitureFallbacks: readonly HistoryFurnitureFallback[];
      generatedDataUrl: string;
      customInstruction: string | null;
    }
  ) => Promise<THistoryItem>;
};

type HistoryVibeSourceRow = {
  id: string;
  room_image_id: string | null;
  selected_furniture_item_ids: string[] | null;
  selected_furnitures_snapshot: unknown;
  room_name_snapshot: string;
  room_storage_path_snapshot: string;
  room_mime_type_snapshot: string;
  room_file_size_snapshot: number;
  room_aspect_ratio_snapshot: string | null;
  furniture_item_id: string | null;
  furniture_name_snapshot: string;
  furniture_storage_path_snapshot: string;
  furniture_mime_type_snapshot: string;
  furniture_file_size_snapshot: number;
  furniture_category_snapshot: string;
  generated_storage_path: string;
  generated_mime_type: string;
};

function readTrimmedStringField(body: Record<string, unknown>, key: string): string {
  return typeof body[key] === 'string' ? body[key].trim() : '';
}

function getVipExpiredMessage() {
  return '您的会员套餐已到期，请联系客服咨询续费。';
}

function getFreeLimitReachedMessage() {
  return `免费用户生图额度已用完（共 ${FREE_GENERATION_LIMIT} 张），请联系客服咨询购买会员套餐。`;
}

function withGenerationHistorySchemaCheck<T>(action: () => Promise<T>) {
  return action().catch((error) => {
    throw createGenerationHistorySchemaError(error);
  });
}

function resolveVibeSourceFromHistoryRow(
  row: HistoryVibeSourceRow
): OwnedHistoryVibeSource | null {
  const furnitureSnapshots = normalizeHistoryFurnitureSnapshots({
    legacyFurniture: {
      id: row.furniture_item_id,
      name: row.furniture_name_snapshot,
      category: row.furniture_category_snapshot,
      storagePath: row.furniture_storage_path_snapshot,
      mimeType: row.furniture_mime_type_snapshot,
      fileSize: row.furniture_file_size_snapshot,
    },
    selectedFurnituresSnapshot: row.selected_furnitures_snapshot,
  });

  if (furnitureSnapshots.length === 0) {
    return null;
  }

  const sourceFurnitureIds = Array.isArray(row.selected_furniture_item_ids) && row.selected_furniture_item_ids.length > 0
    ? row.selected_furniture_item_ids
    : row.furniture_item_id
      ? [row.furniture_item_id]
      : [];

  const furnitureItemIds = furnitureSnapshots.map(
    (snapshot, index) => sourceFurnitureIds[index] ?? snapshot.id ?? `${row.id}:furniture:${index}`
  );

  return {
    historyItemId: row.id,
    roomImageId: row.room_image_id,
    roomFallback: {
      name: row.room_name_snapshot,
      storagePath: row.room_storage_path_snapshot,
      mimeType: row.room_mime_type_snapshot,
      fileSize: row.room_file_size_snapshot,
      aspectRatio: row.room_aspect_ratio_snapshot,
    },
    furnitureItemIds,
    furnitureFallbacks: furnitureSnapshots.map((snapshot) => ({
      name: snapshot.name,
      storagePath: snapshot.storagePath,
      mimeType: snapshot.mimeType,
      fileSize: snapshot.fileSize,
      category: snapshot.category,
    })),
    generatedImage: {
      storagePath: row.generated_storage_path,
      mimeType: row.generated_mime_type,
      aspectRatio: row.room_aspect_ratio_snapshot,
    },
  };
}

export function parseGenerateVibeRequest(body: Record<string, unknown>): GenerateVibeRequest {
  const historyItemId = readTrimmedStringField(body, 'historyItemId');

  if (!historyItemId) {
    throw createRouteError({
      status: 400,
      code: 'INVALID_GENERATE_VIBE_REQUEST',
      message: 'History item id is required.',
    });
  }

  return {
    historyItemId,
  };
}

export async function generateRoomVibeForUser<THistoryItem>(
  user: GenerationServiceUser,
  input: GenerateVibeRequest,
  deps: GenerationVibeServiceDeps<THistoryItem>
) {
  const runWithConcurrencyGuard = deps.runWithConcurrencyGuard ?? (async <T>(
    _userId: string,
    action: () => Promise<T>
  ) => action());

  return runWithConcurrencyGuard(user.id, async () => {
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

    const source = await deps.getOwnedHistoryVibeSource(user.id, input.historyItemId);
    if (!source) {
      throw createRouteError({
        status: 404,
        code: 'HISTORY_ITEM_NOT_FOUND',
        message: 'History item not found.',
      });
    }

    const generatedDataUrl = await deps.generateVibe({
      generatedImage: source.generatedImage,
    });

    return deps.createHistoryItem(user.id, {
      roomImageId: source.roomImageId,
      roomFallback: source.roomFallback,
      furnitureItemIds: source.furnitureItemIds,
      furnitureFallbacks: source.furnitureFallbacks,
      generatedDataUrl,
      customInstruction: null,
    });
  });
}

async function createDefaultGenerationVibeServiceDeps() {
  const [
    { query },
    { countUserGenerationHistory },
    { createHistoryItem },
    { enhanceRoomVibe },
    { runWithGenerationConcurrencyGuard },
  ] = await Promise.all([
    import('../../db.ts'),
    import('../repositories/history-repository.ts'),
    import('../assets.ts'),
    import('../gemini.ts'),
    import('../generation-concurrency.ts'),
  ]);

  const deps: GenerationVibeServiceDeps = {
    runWithConcurrencyGuard(userId, action) {
      return runWithGenerationConcurrencyGuard(userId, action);
    },
    async getGenerationCount(userId) {
      return countUserGenerationHistory(userId);
    },
    async getOwnedHistoryVibeSource(userId, historyItemId) {
      const result = await withGenerationHistorySchemaCheck(() =>
        query<HistoryVibeSourceRow>(
          `select
             id,
             room_image_id,
             selected_furniture_item_ids,
             selected_furnitures_snapshot,
             room_name_snapshot,
             room_storage_path_snapshot,
             room_mime_type_snapshot,
             room_file_size_snapshot,
             room_aspect_ratio_snapshot,
             furniture_item_id,
             furniture_name_snapshot,
             furniture_storage_path_snapshot,
             furniture_mime_type_snapshot,
             furniture_file_size_snapshot,
             furniture_category_snapshot,
             generated_storage_path,
             generated_mime_type
           from generation_history
           where id = $1 and user_id = $2`,
          [historyItemId, userId]
        )
      );

      const row = result.rows[0];
      if (!row) {
        return null;
      }

      return resolveVibeSourceFromHistoryRow(row);
    },
    async generateVibe(input) {
      const result = await enhanceRoomVibe({
        sourceImage: input.generatedImage,
      });
      return result.generatedDataUrl;
    },
    async createHistoryItem(userId, input) {
      return createHistoryItem(userId, {
        roomImageId: input.roomImageId,
        roomFallback: input.roomFallback,
        furnitureItemIds: [...input.furnitureItemIds],
        furnitureFallbacks: [...input.furnitureFallbacks],
        generatedDataUrl: input.generatedDataUrl,
        customInstruction: input.customInstruction,
      });
    },
  };

  return deps;
}

export async function generateRoomVibeForUserWithDefaults(
  user: GenerationServiceUser,
  input: GenerateVibeRequest
) {
  const deps = await createDefaultGenerationVibeServiceDeps();
  return generateRoomVibeForUser(user, input, deps);
}
