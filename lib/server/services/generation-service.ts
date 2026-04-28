import {
  buildHistorySnapshotRoomId,
  canUseHistoryRoomSnapshotForRequest,
} from '../../history-room-snapshot.ts';
import { MAX_SELECTED_FURNITURES } from '../../room-editor-limits.ts';
import { createRouteError } from '../http/error-envelope.ts';
import {
  createDefaultGenerationExecutionDeps,
  runGenerationWithAccess,
  type GenerationExecutionDeps,
  type GenerationServiceUser,
} from './generation-execution.ts';

export type GenerateRoomRequest = {
  roomImageId: string;
  historyItemId: string | null;
  furnitureItemIds: string[];
  customInstruction: string | null;
};

export type OwnedRoomImageSource = {
  id: string;
  name: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  aspectRatio: string | null;
};

export type OwnedFurnitureItemSource = {
  id: string;
  name: string;
  category: string;
  storagePath: string;
  mimeType: string;
};

export type GenerationServiceDeps<THistoryItem = unknown> = GenerationExecutionDeps & {
  getOwnedRoomImage: (
    userId: string,
    roomImageId: string
  ) => Promise<OwnedRoomImageSource | null>;
  getHistoryRoomSnapshot: (
    userId: string,
    historyItemId: string,
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
      roomImageId: string | null;
      roomFallback?: OwnedRoomImageSource | null;
      furnitureItemIds: readonly string[];
      generatedDataUrl: string;
      customInstruction: string | null;
    }
  ) => Promise<THistoryItem>;
};

type RoomSourceRow = {
  id: string;
  name: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  aspect_ratio: string | null;
};

type FurnitureSourceRow = {
  id: string;
  name: string;
  category: string;
  storage_path: string;
  mime_type: string;
};

type HistoryRoomSnapshotRow = {
  id: string;
  room_image_id: string | null;
  room_name_snapshot: string;
  room_storage_path_snapshot: string;
  room_mime_type_snapshot: string;
  room_file_size_snapshot: number;
  room_aspect_ratio_snapshot: string | null;
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

function getTooManyFurnitureItemsMessage() {
  return `一次最多只能选择 ${MAX_SELECTED_FURNITURES} 张家具图。`;
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

  if (resolvedFurnitureItemIds.length > MAX_SELECTED_FURNITURES) {
    throw createRouteError({
      status: 400,
      code: 'TOO_MANY_FURNITURE_ITEMS',
      message: getTooManyFurnitureItemsMessage(),
    });
  }

  const customInstruction = readTrimmedStringField(body, 'customInstruction');
  const historyItemId = readTrimmedStringField(body, 'historyItemId');

  return {
    roomImageId,
    historyItemId: historyItemId || null,
    furnitureItemIds: resolvedFurnitureItemIds,
    customInstruction: customInstruction || null,
  };
}

export async function generateRoomVisualizationForUser<THistoryItem>(
  user: GenerationServiceUser,
  input: GenerateRoomRequest,
  deps: GenerationServiceDeps<THistoryItem>
) {
  return runGenerationWithAccess(user, deps, async () => {
    const ownedRoomImage = await deps.getOwnedRoomImage(user.id, input.roomImageId);
    const historyRoomSnapshot = !ownedRoomImage && input.historyItemId
      ? await deps.getHistoryRoomSnapshot(user.id, input.historyItemId, input.roomImageId)
      : null;
    const roomImage = ownedRoomImage ?? historyRoomSnapshot;
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

    const generationStartedAt = Date.now();
    let generatedDataUrl: string;
    try {
      generatedDataUrl = await deps.generateVisualization({
        roomImage,
        furnitureItems: orderedFurnitureItems,
        customInstruction: input.customInstruction,
      });
      console.info('[generation-service] visualization generated', {
        userId: user.id,
        roomImageId: roomImage.id,
        furnitureCount: orderedFurnitureItems.length,
        durationMs: Date.now() - generationStartedAt,
      });
    } catch (error) {
      console.error(
        '[generation-service] visualization failed',
        {
          userId: user.id,
          roomImageId: roomImage.id,
          furnitureCount: orderedFurnitureItems.length,
          durationMs: Date.now() - generationStartedAt,
        },
        error
      );
      throw error;
    }

    const persistenceStartedAt = Date.now();
    try {
      const historyItem = await deps.createHistoryItem(user.id, {
        roomImageId: ownedRoomImage?.id ?? null,
        roomFallback: historyRoomSnapshot,
        furnitureItemIds: orderedFurnitureItems.map((item) => item.id),
        generatedDataUrl,
        customInstruction: input.customInstruction,
      });
      console.info('[generation-service] history persisted', {
        userId: user.id,
        roomImageId: roomImage.id,
        furnitureCount: orderedFurnitureItems.length,
        durationMs: Date.now() - persistenceStartedAt,
      });
      return historyItem;
    } catch (error) {
      console.error(
        '[generation-service] history persistence failed',
        {
          userId: user.id,
          roomImageId: roomImage.id,
          furnitureCount: orderedFurnitureItems.length,
          durationMs: Date.now() - persistenceStartedAt,
        },
        error
      );
      throw error;
    }
  });
}

async function createDefaultGenerationServiceDeps() {
  const [
    { query },
    executionDeps,
    { createHistoryItem },
    { generateRoomVisualization },
  ] = await Promise.all([
    import('../../db.ts'),
    createDefaultGenerationExecutionDeps(),
    import('../assets.ts'),
    import('../gemini.ts'),
  ]);

  const deps: GenerationServiceDeps = {
    ...executionDeps,
    async getOwnedRoomImage(userId, roomImageId) {
      const roomResult = await query<RoomSourceRow>(
        `select id, name, storage_path, mime_type, file_size, aspect_ratio
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
        fileSize: row.file_size,
        aspectRatio: row.aspect_ratio,
      };
    },
    async getHistoryRoomSnapshot(userId, historyItemId, roomImageId) {
      const historyResult = await query<HistoryRoomSnapshotRow>(
        `select
           id,
           room_image_id,
           room_name_snapshot,
           room_storage_path_snapshot,
           room_mime_type_snapshot,
           room_file_size_snapshot,
           room_aspect_ratio_snapshot
         from generation_history
         where id = $1 and user_id = $2`,
        [historyItemId, userId]
      );

      const row = historyResult.rows[0];
      if (!row) {
        return null;
      }

      const canUseHistorySnapshot = canUseHistoryRoomSnapshotForRequest({
        historyItemId: row.id,
        storedRoomImageId: row.room_image_id,
        requestedRoomImageId: roomImageId,
      });
      if (!canUseHistorySnapshot) {
        return null;
      }

      const snapshotRoomId = buildHistorySnapshotRoomId({
        historyItemId: row.id,
        roomImageId: row.room_image_id,
      });

      return {
        id: snapshotRoomId,
        name: row.room_name_snapshot,
        storagePath: row.room_storage_path_snapshot,
        mimeType: row.room_mime_type_snapshot,
        fileSize: row.room_file_size_snapshot,
        aspectRatio: row.room_aspect_ratio_snapshot,
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
        roomFallback: input.roomFallback ?? undefined,
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
