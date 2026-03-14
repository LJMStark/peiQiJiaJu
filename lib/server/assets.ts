import 'server-only';

import { randomUUID } from 'node:crypto';
import { query } from '@/lib/db';
import type { FurnitureItem, HistoryItem, RoomAspectRatio, RoomImage } from '@/lib/dashboard-types';
import { createSignedImageUrl, removeImage, uploadGeneratedImage, uploadImageFile } from '@/lib/server/storage';

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

type HistoryRow = {
  id: string;
  room_image_id: string | null;
  furniture_item_id: string | null;
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
};

function coerceDisplayName(name: string | null | undefined, fallback: string) {
  const value = name?.trim();
  return value || fallback;
}

function normalizeInstruction(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed || null;
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

async function serializeHistory(row: HistoryRow): Promise<HistoryItem> {
  return {
    id: row.id,
    roomImage: {
      id: row.room_image_id ?? `${row.id}:room`,
      name: row.room_name_snapshot,
      storagePath: row.room_storage_path_snapshot,
      imageUrl: await createSignedImageUrl('room', row.room_storage_path_snapshot),
      mimeType: row.room_mime_type_snapshot,
      fileSize: row.room_file_size_snapshot,
      aspectRatio: (row.room_aspect_ratio_snapshot as RoomAspectRatio | null) ?? undefined,
      createdAt: row.created_at,
    },
    furniture: {
      id: row.furniture_item_id ?? `${row.id}:furniture`,
      name: row.furniture_name_snapshot,
      category: row.furniture_category_snapshot,
      storagePath: row.furniture_storage_path_snapshot,
      imageUrl: await createSignedImageUrl('furniture', row.furniture_storage_path_snapshot),
      mimeType: row.furniture_mime_type_snapshot,
      fileSize: row.furniture_file_size_snapshot,
      createdAt: row.created_at,
    },
    generatedImage: {
      id: `${row.id}:generated`,
      name: row.generated_name,
      storagePath: row.generated_storage_path,
      imageUrl: await createSignedImageUrl('generated', row.generated_storage_path),
      mimeType: row.generated_mime_type,
      fileSize: row.generated_file_size,
      createdAt: row.created_at,
    },
    customInstruction: row.custom_instruction ?? undefined,
    createdAt: row.created_at,
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
    throw new Error('Furniture item not found.');
  }

  const historyCount = await query<{ count: string }>(
    `select count(*)::text as count from generation_history where user_id = $1 and furniture_item_id = $2`,
    [userId, id]
  );

  await query(`delete from furniture_items where id = $1 and user_id = $2`, [id, userId]);

  if (Number(historyCount.rows[0]?.count ?? '0') === 0) {
    await removeImage('furniture', existing.storage_path);
  }
}

export async function listRoomImages(userId: string) {
  const result = await query<RoomRow>(
    `select id, name, storage_path, mime_type, file_size, aspect_ratio, created_at, updated_at
     from room_images
     where user_id = $1
     order by created_at desc`,
    [userId]
  );

  return Promise.all(result.rows.map(serializeRoom));
}

export async function createRoomImage(
  userId: string,
  input: { file: File; name?: string | null; aspectRatio?: string | null }
) {
  const name = coerceDisplayName(input.name, input.file.name.replace(/\.[^.]+$/, ''));
  const uploaded = await uploadImageFile(userId, 'room', input.file, input.file.name);
  const id = randomUUID();

  try {
    const result = await query<RoomRow>(
      `insert into room_images (
        id, user_id, name, storage_path, mime_type, file_size, aspect_ratio
      ) values ($1, $2, $3, $4, $5, $6, $7)
      returning id, name, storage_path, mime_type, file_size, aspect_ratio, created_at, updated_at`,
      [id, userId, name, uploaded.storagePath, uploaded.mimeType, uploaded.fileSize, input.aspectRatio ?? null]
    );

    return serializeRoom(result.rows[0]);
  } catch (error) {
    await removeImage('room', uploaded.storagePath).catch(() => undefined);
    throw error;
  }
}

export async function deleteRoomImage(userId: string, id: string) {
  const existingResult = await query<Pick<RoomRow, 'storage_path'>>(
    `select storage_path from room_images where id = $1 and user_id = $2`,
    [id, userId]
  );

  const existing = existingResult.rows[0];
  if (!existing) {
    throw new Error('Room image not found.');
  }

  const historyCount = await query<{ count: string }>(
    `select count(*)::text as count from generation_history where user_id = $1 and room_image_id = $2`,
    [userId, id]
  );

  await query(`delete from room_images where id = $1 and user_id = $2`, [id, userId]);

  if (Number(historyCount.rows[0]?.count ?? '0') === 0) {
    await removeImage('room', existing.storage_path);
  }
}

export async function listHistoryItems(userId: string) {
  const result = await query<HistoryRow>(
    `select
        id,
        room_image_id,
        furniture_item_id,
        room_name_snapshot,
        room_storage_path_snapshot,
        room_mime_type_snapshot,
        room_file_size_snapshot,
        room_aspect_ratio_snapshot,
        furniture_name_snapshot,
        furniture_storage_path_snapshot,
        furniture_mime_type_snapshot,
        furniture_file_size_snapshot,
        furniture_category_snapshot,
        generated_name,
        generated_storage_path,
        generated_mime_type,
        generated_file_size,
        custom_instruction,
        created_at
      from generation_history
      where user_id = $1
      order by created_at desc`,
    [userId]
  );

  return Promise.all(result.rows.map(serializeHistory));
}

export async function createHistoryItem(
  userId: string,
  input: {
    roomImageId: string;
    furnitureItemId: string;
    generatedDataUrl: string;
    customInstruction?: string | null;
  }
) {
  const [roomResult, furnitureResult] = await Promise.all([
    query<RoomRow>(
      `select id, name, storage_path, mime_type, file_size, aspect_ratio, created_at, updated_at
       from room_images
       where id = $1 and user_id = $2`,
      [input.roomImageId, userId]
    ),
    query<FurnitureRow>(
      `select id, name, category, storage_path, mime_type, file_size, created_at, updated_at
       from furniture_items
       where id = $1 and user_id = $2`,
      [input.furnitureItemId, userId]
    ),
  ]);

  const room = roomResult.rows[0];
  const furniture = furnitureResult.rows[0];

  if (!room) {
    throw new Error('Room image not found.');
  }

  if (!furniture) {
    throw new Error('Furniture item not found.');
  }

  const generatedName = `${room.name}-${furniture.name}-generated`;
  const uploaded = await uploadGeneratedImage(userId, input.generatedDataUrl, generatedName);
  const id = randomUUID();

  try {
    const result = await query<HistoryRow>(
      `insert into generation_history (
        id,
        user_id,
        room_image_id,
        furniture_item_id,
        room_name_snapshot,
        room_storage_path_snapshot,
        room_mime_type_snapshot,
        room_file_size_snapshot,
        room_aspect_ratio_snapshot,
        furniture_name_snapshot,
        furniture_storage_path_snapshot,
        furniture_mime_type_snapshot,
        furniture_file_size_snapshot,
        furniture_category_snapshot,
        generated_name,
        generated_storage_path,
        generated_mime_type,
        generated_file_size,
        custom_instruction
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
      )
      returning
        id,
        room_image_id,
        furniture_item_id,
        room_name_snapshot,
        room_storage_path_snapshot,
        room_mime_type_snapshot,
        room_file_size_snapshot,
        room_aspect_ratio_snapshot,
        furniture_name_snapshot,
        furniture_storage_path_snapshot,
        furniture_mime_type_snapshot,
        furniture_file_size_snapshot,
        furniture_category_snapshot,
        generated_name,
        generated_storage_path,
        generated_mime_type,
        generated_file_size,
        custom_instruction,
        created_at`,
      [
        id,
        userId,
        room.id,
        furniture.id,
        room.name,
        room.storage_path,
        room.mime_type,
        room.file_size,
        room.aspect_ratio,
        furniture.name,
        furniture.storage_path,
        furniture.mime_type,
        furniture.file_size,
        furniture.category,
        generatedName,
        uploaded.storagePath,
        uploaded.mimeType,
        uploaded.fileSize,
        normalizeInstruction(input.customInstruction),
      ]
    );

    return serializeHistory(result.rows[0]);
  } catch (error) {
    await removeImage('generated', uploaded.storagePath).catch(() => undefined);
    throw error;
  }
}
