import 'server-only';

import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { db, query } from '@/lib/db';
import type { FurnitureItem, HistoryItem, RoomAspectRatio, RoomImage } from '@/lib/dashboard-types';
import type { HistoryPageCursor } from '@/lib/history-page';
import { buildHistorySnapshotRoomId } from '@/lib/history-room-snapshot';
import { runWithRoomCleanupRecovery } from '@/lib/room-image-cleanup';
import { createRoomImageCleanupPlan } from '@/lib/room-image-policy';
import { inferRoomAspectRatioFromDimensions } from '@/lib/room-aspect-ratio';
import {
  createGenerationHistorySchemaError,
  getGenerationHistoryCountByFurnitureQuery,
  getGenerationHistoryInsertQuery,
  getGenerationHistorySelectQuery,
} from '@/lib/server/generation-history-schema';
import {
  normalizeHistoryFurnitureSnapshots,
  resolveHistoryFurnitureSelection,
  type HistoryFurnitureSnapshot as HistoryFurnitureSnapshotData,
} from '@/lib/room-visualization';
import {
  copyStoredImage,
  createSignedImageUrl,
  createSignedImageUrlMap,
  removeImage,
  removeImages,
  uploadGeneratedImage,
  uploadImageFile,
} from '@/lib/server/storage';

type FurnitureRow = {
  id: string;
  name: string;
  category: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  created_at: string;
  updated_at: string;
};

type RoomRow = {
  id: string;
  name: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  aspect_ratio: string | null;
  created_at: string;
  updated_at: string;
};

type RoomRowWithHistoryReferenceCount = RoomRow & {
  history_reference_count: number;
};

type HistoryRow = {
  id: string;
  room_image_id: string | null;
  furniture_item_id: string | null;
  selected_furniture_item_ids: string[] | null;
  selected_furnitures_snapshot: HistoryFurnitureSnapshotData[] | null;
  room_name_snapshot: string;
  room_storage_path_snapshot: string;
  room_mime_type_snapshot: string;
  room_file_size_snapshot: number;
  room_aspect_ratio_snapshot: string | null;
  furniture_name_snapshot: string;
  furniture_storage_path_snapshot: string;
  furniture_mime_type_snapshot: string;
  furniture_file_size_snapshot: number;
  furniture_category_snapshot: string;
  generated_name: string;
  generated_storage_path: string;
  generated_mime_type: string;
  generated_file_size: number;
  custom_instruction: string | null;
  created_at: string;
  created_at_cursor: string;
};

type PreparedHistoryRow = {
  row: HistoryRow;
  furnitureSnapshots: HistoryFurnitureSnapshotData[];
};

type HistorySignedUrlMaps = {
  furniture: ReadonlyMap<string, string>;
  room: ReadonlyMap<string, string>;
  generated: ReadonlyMap<string, string>;
};

export type HistoryItemsPage = {
  items: HistoryItem[];
  hasMore: boolean;
  nextCursor: HistoryPageCursor | null;
};

type ListHistoryItemsOptions = {
  limit?: number;
  cursor?: HistoryPageCursor;
};

const DEFAULT_HISTORY_PAGE_SIZE = 12;
const MAX_HISTORY_PAGE_SIZE = 12;

async function withGenerationHistorySchemaCheck<T>(action: () => Promise<T>) {
  try {
    return await action();
  } catch (error) {
    throw createGenerationHistorySchemaError(error);
  }
}

function coerceDisplayName(name: string | null | undefined, fallback: string) {
  const value = name?.trim();
  return value || fallback;
}

function normalizeInstruction(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function buildGeneratedName(roomName: string, furnitures: HistoryFurnitureSnapshotData[]) {
  const baseLabel = furnitures
    .slice(0, 2)
    .map((furniture) => furniture.name)
    .filter(Boolean)
    .join('-') || 'furniture';
  const suffix = furnitures.length > 2 ? `-plus-${furnitures.length - 2}-more` : '';

  return `${roomName}-${baseLabel}${suffix}-generated`;
}

function buildRoomHistorySnapshotName(roomName: string) {
  return `${roomName}-history-room`;
}

async function serializeFurniture(row: FurnitureRow): Promise<FurnitureItem> {
  return {
    id: row.id,
    name: row.name,
    category: row.category || '其他',
    storagePath: row.storage_path,
    imageUrl: await createSignedImageUrl('furniture', row.storage_path),
    mimeType: row.mime_type,
    fileSize: row.file_size,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function serializeRoom(row: RoomRow): Promise<RoomImage> {
  return {
    id: row.id,
    name: row.name,
    storagePath: row.storage_path,
    imageUrl: await createSignedImageUrl('room', row.storage_path),
    mimeType: row.mime_type,
    fileSize: row.file_size,
    aspectRatio: (row.aspect_ratio as RoomAspectRatio | null) ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function loadRoomImagesWithHistoryReferenceCounts(client: PoolClient, userId: string) {
  const result = await client.query<RoomRowWithHistoryReferenceCount>(
    `select
       r.id,
       r.name,
       r.storage_path,
       r.mime_type,
       r.file_size,
       r.aspect_ratio,
       r.created_at,
       r.updated_at,
       count(h.id)::int as history_reference_count
     from room_images r
     left join generation_history h
       on h.user_id = r.user_id
      and h.room_image_id = r.id
     where r.user_id = $1
     group by
       r.id,
       r.name,
       r.storage_path,
       r.mime_type,
       r.file_size,
       r.aspect_ratio,
       r.created_at,
       r.updated_at
     order by r.created_at desc, r.id desc`,
    [userId]
  );

  return result.rows;
}

async function deleteRoomImagesByIds(client: PoolClient, userId: string, roomIds: readonly string[]) {
  if (roomIds.length === 0) {
    return;
  }

  await client.query(`delete from room_images where user_id = $1 and id = any($2::text[])`, [userId, roomIds]);
}

async function cleanupRoomImageStoragePaths(storagePaths: readonly string[]): Promise<void> {
  await removeImages('room', storagePaths);
}

function getRequiredSignedUrl(signedUrlMap: ReadonlyMap<string, string>, storagePath: string) {
  const signedUrl = signedUrlMap.get(storagePath);
  if (!signedUrl) {
    throw new Error(`Failed to create signed URL: Missing signed URL for ${storagePath}`);
  }

  return signedUrl;
}

function prepareHistoryRow(row: HistoryRow): PreparedHistoryRow {
  return {
    row,
    furnitureSnapshots: normalizeHistoryFurnitureSnapshots({
      legacyFurniture: {
        id: row.furniture_item_id,
        name: row.furniture_name_snapshot,
        category: row.furniture_category_snapshot,
        storagePath: row.furniture_storage_path_snapshot,
        mimeType: row.furniture_mime_type_snapshot,
        fileSize: row.furniture_file_size_snapshot,
      },
      selectedFurnituresSnapshot: row.selected_furnitures_snapshot,
    }),
  };
}

async function createHistorySignedUrlMaps(
  preparedRows: readonly PreparedHistoryRow[]
): Promise<HistorySignedUrlMaps> {
  const [furniture, room, generated] = await Promise.all([
    createSignedImageUrlMap(
      'furniture',
      preparedRows.flatMap(({ furnitureSnapshots }) =>
        furnitureSnapshots.map((snapshot) => snapshot.storagePath)
      )
    ),
    createSignedImageUrlMap(
      'room',
      preparedRows.map(({ row }) => row.room_storage_path_snapshot)
    ),
    createSignedImageUrlMap(
      'generated',
      preparedRows.map(({ row }) => row.generated_storage_path)
    ),
  ]);

  return {
    furniture,
    room,
    generated,
  };
}

function serializeHistoryFurnitureSnapshot(
  snapshot: HistoryFurnitureSnapshotData,
  fallbackId: string,
  createdAt: string,
  signedUrlMap: ReadonlyMap<string, string>
): FurnitureItem {
  return {
    id: snapshot.id ?? fallbackId,
    name: snapshot.name,
    category: snapshot.category || '其他',
    storagePath: snapshot.storagePath,
    imageUrl: getRequiredSignedUrl(signedUrlMap, snapshot.storagePath),
    mimeType: snapshot.mimeType,
    fileSize: snapshot.fileSize,
    createdAt,
  };
}

function serializeHistory(
  preparedRow: PreparedHistoryRow,
  signedUrlMaps: HistorySignedUrlMaps
): HistoryItem {
  const { row, furnitureSnapshots } = preparedRow;
  const furnitures = furnitureSnapshots.map((snapshot, index) =>
    serializeHistoryFurnitureSnapshot(
      snapshot,
      `${row.id}:furniture:${index}`,
      row.created_at_cursor,
      signedUrlMaps.furniture
    )
  );

  return {
    id: row.id,
    roomImage: {
      id: buildHistorySnapshotRoomId({
        historyItemId: row.id,
        roomImageId: row.room_image_id,
      }),
      name: row.room_name_snapshot,
      storagePath: row.room_storage_path_snapshot,
      imageUrl: getRequiredSignedUrl(signedUrlMaps.room, row.room_storage_path_snapshot),
      mimeType: row.room_mime_type_snapshot,
      fileSize: row.room_file_size_snapshot,
      aspectRatio: (row.room_aspect_ratio_snapshot as RoomAspectRatio | null) ?? undefined,
      createdAt: row.created_at_cursor,
    },
    furniture: furnitures[0]!,
    furnitures,
    generatedImage: {
      id: `${row.id}:generated`,
      name: row.generated_name,
      storagePath: row.generated_storage_path,
      imageUrl: getRequiredSignedUrl(signedUrlMaps.generated, row.generated_storage_path),
      mimeType: row.generated_mime_type,
      fileSize: row.generated_file_size,
      createdAt: row.created_at_cursor,
    },
    customInstruction: row.custom_instruction ?? undefined,
    createdAt: row.created_at_cursor,
  };
}

export async function listFurnitureItems(userId: string) {
  const result = await query<FurnitureRow>(
    `select id, name, category, storage_path, mime_type, file_size, created_at, updated_at
     from furniture_items
     where user_id = $1
     order by created_at desc`,
    [userId]
  );

  return Promise.all(result.rows.map(serializeFurniture));
}

export async function createFurnitureItem(
  userId: string,
  input: { file: File; name?: string | null; category?: string | null }
) {
  const name = coerceDisplayName(input.name, input.file.name.replace(/\.[^.]+$/, ''));
  const category = coerceDisplayName(input.category, '其他');
  const uploaded = await uploadImageFile(userId, 'furniture', input.file, input.file.name);
  const id = randomUUID();

  try {
    const result = await query<FurnitureRow>(
      `insert into furniture_items (
        id, user_id, name, category, storage_path, mime_type, file_size
      ) values ($1, $2, $3, $4, $5, $6, $7)
      returning id, name, category, storage_path, mime_type, file_size, created_at, updated_at`,
      [id, userId, name, category, uploaded.storagePath, uploaded.mimeType, uploaded.fileSize]
    );

    return serializeFurniture(result.rows[0]);
  } catch (error) {
    await removeImage('furniture', uploaded.storagePath).catch(() => undefined);
    throw error;
  }
}

export async function updateFurnitureItem(
  userId: string,
  id: string,
  updates: { name?: string | null; category?: string | null }
) {
  const name = updates.name?.trim() || null;
  const category = updates.category?.trim() || null;
  const result = await query<FurnitureRow>(
    `update furniture_items
     set name = coalesce($3, name),
         category = coalesce($4, category),
         updated_at = now()
     where id = $1 and user_id = $2
     returning id, name, category, storage_path, mime_type, file_size, created_at, updated_at`,
    [id, userId, name, category]
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error('Furniture item not found.');
  }

  return serializeFurniture(row);
}

export async function deleteFurnitureItem(userId: string, id: string) {
  const existingResult = await query<Pick<FurnitureRow, 'storage_path'>>(
    `select storage_path from furniture_items where id = $1 and user_id = $2`,
    [id, userId]
  );

  const existing = existingResult.rows[0];
  if (!existing) {
    return {
      storagePathsToDelete: [],
    };
  }

  const historyCount = await withGenerationHistorySchemaCheck(() =>
    query<{ count: string }>(getGenerationHistoryCountByFurnitureQuery('modern'), [userId, id])
  );

  await query(`delete from furniture_items where id = $1 and user_id = $2`, [id, userId]);

  return {
    storagePathsToDelete: Number(historyCount.rows[0]?.count ?? '0') === 0 ? [existing.storage_path] : [],
  };
}

export async function listRoomImages(userId: string) {
  const client = await db.connect();
  let currentRooms: RoomRow[] = [];
  let staleStoragePathsToDelete: string[] = [];

  try {
    await client.query('BEGIN');

    const roomRows = await loadRoomImagesWithHistoryReferenceCounts(client, userId);
    const currentRoom = roomRows[0];
    const cleanupPlan = createRoomImageCleanupPlan(
      roomRows.map((room) => ({
        id: room.id,
        storagePath: room.storage_path,
        historyReferenceCount: room.history_reference_count,
      })),
      currentRoom ? [currentRoom.id] : []
    );

    await deleteRoomImagesByIds(client, userId, cleanupPlan.staleRoomIds);
    await client.query('COMMIT');

    currentRooms = currentRoom ? [currentRoom] : [];
    staleStoragePathsToDelete = cleanupPlan.staleStoragePathsToDelete;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  const items = await runWithRoomCleanupRecovery({
    action: () => Promise.all(currentRooms.map(serializeRoom)),
    storagePathsToDelete: staleStoragePathsToDelete,
    cleanup: cleanupRoomImageStoragePaths,
  });

  return {
    items,
    storagePathsToDelete: staleStoragePathsToDelete,
  };
}

export async function createRoomImage(
  userId: string,
  input: { file: File; name?: string | null }
) {
  const name = coerceDisplayName(input.name, input.file.name.replace(/\.[^.]+$/, ''));
  const uploaded = await uploadImageFile(userId, 'room', input.file, input.file.name);
  const aspectRatio = inferRoomAspectRatioFromDimensions({
    width: uploaded.width,
    height: uploaded.height,
  });
  const id = randomUUID();
  const client = await db.connect();
  let createdRoom: RoomRow | null = null;
  let staleStoragePathsToDelete: string[] = [];
  let didCommit = false;

  try {
    await client.query('BEGIN');

    const existingRooms = await loadRoomImagesWithHistoryReferenceCounts(client, userId);
    const result = await client.query<RoomRow>(
      `insert into room_images (
         id, user_id, name, storage_path, mime_type, file_size, aspect_ratio
       ) values ($1, $2, $3, $4, $5, $6, $7)
       returning id, name, storage_path, mime_type, file_size, aspect_ratio, created_at, updated_at`,
      [id, userId, name, uploaded.storagePath, uploaded.mimeType, uploaded.fileSize, aspectRatio]
    );
    const cleanupPlan = createRoomImageCleanupPlan(
      existingRooms.map((room) => ({
        id: room.id,
        storagePath: room.storage_path,
        historyReferenceCount: room.history_reference_count,
      })),
      []
    );

    await deleteRoomImagesByIds(client, userId, cleanupPlan.staleRoomIds);
    await client.query('COMMIT');

    createdRoom = result.rows[0] ?? null;
    staleStoragePathsToDelete = cleanupPlan.staleStoragePathsToDelete;
    didCommit = true;
  } catch (error) {
    if (!didCommit) {
      await client.query('ROLLBACK').catch(() => undefined);
      await removeImage('room', uploaded.storagePath).catch(() => undefined);
    }
    throw error;
  } finally {
    client.release();
  }

  if (!createdRoom) {
    throw new Error('Room image upload did not return a record.');
  }

  const item = await runWithRoomCleanupRecovery({
    action: () => serializeRoom(createdRoom),
    storagePathsToDelete: staleStoragePathsToDelete,
    cleanup: cleanupRoomImageStoragePaths,
  });

  return {
    item,
    storagePathsToDelete: staleStoragePathsToDelete,
  };
}

export async function deleteRoomImage(userId: string, id: string) {
  const deletedResult = await query<{ storage_path: string; history_reference_count: number }>(
    `with deleted_room as (
       delete from room_images
       where id = $1 and user_id = $2
       returning storage_path
     )
     select
       deleted_room.storage_path,
       (
         select count(*)::int
         from generation_history
         where user_id = $2 and room_image_id = $1
       ) as history_reference_count
     from deleted_room`,
    [id, userId]
  );

  const deletedRoom = deletedResult.rows[0];
  if (!deletedRoom) {
    return {
      storagePathsToDelete: [],
    };
  }

  return {
    storagePathsToDelete: deletedRoom.history_reference_count === 0 ? [deletedRoom.storage_path] : [],
  };
}

function normalizeHistoryPageSize(limit: number | undefined) {
  if (!Number.isFinite(limit)) {
    return DEFAULT_HISTORY_PAGE_SIZE;
  }

  return Math.min(
    MAX_HISTORY_PAGE_SIZE,
    Math.max(1, Math.trunc(limit ?? DEFAULT_HISTORY_PAGE_SIZE))
  );
}

function buildHistoryPageQuery(
  userId: string,
  limit: number,
  cursor?: HistoryPageCursor
): { text: string; values: unknown[] } {
  const pageSize = limit + 1;

  if (!cursor) {
    return {
      text: `${getGenerationHistorySelectQuery('modern')}
           limit $2`,
      values: [userId, pageSize],
    };
  }

  return {
    text: `select *
           from (${getGenerationHistorySelectQuery('modern')}) as history_page
           where history_page.created_at < $2::timestamptz
              or (history_page.created_at = $2::timestamptz and history_page.id < $3)
           order by history_page.created_at desc, history_page.id desc
           limit $4`,
    values: [userId, cursor.createdAt, cursor.id, pageSize],
  };
}

function getNextHistoryCursor(
  preparedRow: PreparedHistoryRow | null,
  hasMore: boolean
): HistoryPageCursor | null {
  if (!hasMore || !preparedRow) {
    return null;
  }

  return {
    createdAt: preparedRow.row.created_at_cursor,
    id: preparedRow.row.id,
  };
}

export async function listHistoryItems(
  userId: string,
  options: ListHistoryItemsOptions = {}
): Promise<HistoryItemsPage> {
  const limit = normalizeHistoryPageSize(options.limit);
  const historyPageQuery = buildHistoryPageQuery(userId, limit, options.cursor);
  const result = await withGenerationHistorySchemaCheck(() =>
    query<HistoryRow>(historyPageQuery.text, historyPageQuery.values)
  );

  const hasMore = result.rows.length > limit;
  const currentRows = result.rows.slice(0, limit);
  const preparedRows = currentRows.map(prepareHistoryRow);
  const signedUrlMaps = await createHistorySignedUrlMaps(preparedRows);
  const items = preparedRows.map((preparedRow) => serializeHistory(preparedRow, signedUrlMaps));
  const lastPreparedRow = preparedRows[preparedRows.length - 1] ?? null;

  return {
    items,
    hasMore,
    nextCursor: getNextHistoryCursor(lastPreparedRow, hasMore),
  };
}

export async function createHistoryItem(
  userId: string,
  input: {
    roomImageId: string | null;
    roomFallback?: {
      name: string;
      storagePath: string;
      mimeType: string;
      fileSize: number;
      aspectRatio: string | null;
    };
    furnitureItemIds: string[];
    generatedDataUrl: string;
    customInstruction?: string | null;
    furnitureFallbacks?: Array<{
      name: string;
      storagePath: string;
      mimeType: string;
      fileSize: number;
      category?: string;
    }>;
  }
) {
  const [roomResult, furnitureResult] = await Promise.all([
    input.roomImageId
      ? query<RoomRow>(
          `select id, name, storage_path, mime_type, file_size, aspect_ratio, created_at, updated_at
           from room_images
           where id = $1 and user_id = $2`,
          [input.roomImageId, userId]
        )
      : Promise.resolve({ rows: [] as RoomRow[] }),
    query<FurnitureRow>(
      `select id, name, category, storage_path, mime_type, file_size, created_at, updated_at
       from furniture_items
       where user_id = $2 and id = any($1::text[])`,
      [input.furnitureItemIds, userId]
    ),
  ]);

  const room = roomResult.rows[0];
  const resolvedRoomSource = room
    ? {
        name: room.name,
        storagePath: room.storage_path,
        mimeType: room.mime_type,
        fileSize: room.file_size,
        aspectRatio: room.aspect_ratio,
      }
    : input.roomFallback
      ? {
          name: input.roomFallback.name,
          storagePath: input.roomFallback.storagePath,
          mimeType: input.roomFallback.mimeType,
          fileSize: input.roomFallback.fileSize,
          aspectRatio: input.roomFallback.aspectRatio,
        }
      : null;
  const furnitureRowsById = new Map(furnitureResult.rows.map((row) => [row.id, row]));

  const resolvedFurnitureSelection = resolveHistoryFurnitureSelection({
    furnitureItemIds: input.furnitureItemIds,
    persistedFurnitures: input.furnitureItemIds.flatMap((furnitureItemId) => {
      const furniture = furnitureRowsById.get(furnitureItemId);
      return furniture
        ? [{
            id: furniture.id,
            name: furniture.name,
            storagePath: furniture.storage_path,
            mimeType: furniture.mime_type,
            fileSize: furniture.file_size,
            category: furniture.category,
          }]
        : [];
    }),
    furnitureFallbacks: input.furnitureFallbacks,
  });

  if (!resolvedRoomSource) {
    throw new Error('Room image not found.');
  }

  if (!resolvedFurnitureSelection) {
    throw new Error('Furniture item not found.');
  }

  const roomSnapshotUpload = await copyStoredImage(userId, 'room', {
    sourcePath: resolvedRoomSource.storagePath,
    mimeType: resolvedRoomSource.mimeType,
    fileName: buildRoomHistorySnapshotName(resolvedRoomSource.name),
  });
  const roomSnapshot = {
    id: null,
    name: resolvedRoomSource.name,
    storagePath: roomSnapshotUpload.storagePath,
    mimeType: resolvedRoomSource.mimeType,
    fileSize: roomSnapshotUpload.fileSize,
    aspectRatio: resolvedRoomSource.aspectRatio,
  };
  const resolvedFurnitureSnapshots = resolvedFurnitureSelection.snapshots;
  const primaryFurnitureSnapshot = resolvedFurnitureSnapshots[0]!;
  const generatedName = buildGeneratedName(roomSnapshot.name, resolvedFurnitureSnapshots);
  try {
    const uploaded = await uploadGeneratedImage(userId, input.generatedDataUrl, generatedName);
    try {
      const id = randomUUID();
      const modernInsertValues = [
        id,
        userId,
        roomSnapshot.id,
        resolvedFurnitureSelection.primaryHistoryFurnitureId,
        resolvedFurnitureSnapshots.map((snapshot) => snapshot.id),
        JSON.stringify(resolvedFurnitureSnapshots),
        roomSnapshot.name,
        roomSnapshot.storagePath,
        roomSnapshot.mimeType,
        roomSnapshot.fileSize,
        roomSnapshot.aspectRatio,
        primaryFurnitureSnapshot.name,
        primaryFurnitureSnapshot.storagePath,
        primaryFurnitureSnapshot.mimeType,
        primaryFurnitureSnapshot.fileSize,
        primaryFurnitureSnapshot.category,
        generatedName,
        uploaded.storagePath,
        uploaded.mimeType,
        uploaded.fileSize,
        normalizeInstruction(input.customInstruction),
      ] as const;
      const legacyInsertValues = [
        id,
        userId,
        roomSnapshot.id,
        resolvedFurnitureSelection.primaryHistoryFurnitureId,
        roomSnapshot.name,
        roomSnapshot.storagePath,
        roomSnapshot.mimeType,
        roomSnapshot.fileSize,
        roomSnapshot.aspectRatio,
        primaryFurnitureSnapshot.name,
        primaryFurnitureSnapshot.storagePath,
        primaryFurnitureSnapshot.mimeType,
        primaryFurnitureSnapshot.fileSize,
        primaryFurnitureSnapshot.category,
        generatedName,
        uploaded.storagePath,
        uploaded.mimeType,
        uploaded.fileSize,
        normalizeInstruction(input.customInstruction),
      ] as const;

      const result = await withGenerationHistorySchemaCheck(() =>
        query<HistoryRow>(getGenerationHistoryInsertQuery('modern'), modernInsertValues)
      );

      const preparedRow = prepareHistoryRow(result.rows[0]);
      const signedUrlMaps = await createHistorySignedUrlMaps([preparedRow]);

      return serializeHistory(preparedRow, signedUrlMaps);
    } catch (error) {
      await removeImage('generated', uploaded.storagePath).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    await removeImage('room', roomSnapshot.storagePath).catch(() => undefined);
    throw error;
  }
}
