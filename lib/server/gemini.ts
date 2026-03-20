import 'server-only';

import { GoogleGenAI } from '@google/genai';
import { FURNITURE_CATEGORIES } from '@/lib/dashboard-types';
import { query } from '@/lib/db';
import { GEMINI_CLASSIFIER_MODEL, GEMINI_IMAGE_MODEL } from '@/lib/gemini-config';
import { buildVisualizationPrompt } from '@/lib/room-visualization';
import { createHistoryItem } from '@/lib/server/assets';
import { getStorageBucket } from '@/lib/storage-config';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type FurnitureSourceRow = {
  id: string;
  name: string;
  category: string;
  storage_path: string;
  mime_type: string;
};

type RoomSourceRow = {
  id: string;
  name: string;
  storage_path: string;
  mime_type: string;
  aspect_ratio: string | null;
};

const VALID_FURNITURE_CATEGORIES = new Set<string>(
  FURNITURE_CATEGORIES.filter((category) => category !== '全部')
);

function getGeminiApiKey() {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set.');
  }

  return apiKey;
}

function getGeminiClient() {
  return new GoogleGenAI({ apiKey: getGeminiApiKey() });
}

function normalizeFurnitureCategory(category: string | null | undefined) {
  const value = category?.trim();

  if (!value || !VALID_FURNITURE_CATEGORIES.has(value)) {
    return null;
  }

  return value;
}

async function downloadStorageAssetBase64(
  bucket: string,
  storagePath: string
) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.from(bucket).download(storagePath);

  if (error || !data) {
    throw new Error(`Failed to load source image: ${error?.message ?? 'Unknown storage error'}`);
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  return buffer.toString('base64');
}

export async function classifyFurnitureFile(
  file: File,
  fallbackCategory?: string | null
) {
  const normalizedFallback = normalizeFurnitureCategory(fallbackCategory);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const response = await getGeminiClient().models.generateContent({
      model: GEMINI_CLASSIFIER_MODEL,
      contents: [
        {
          inlineData: {
            data: buffer.toString('base64'),
            mimeType: file.type,
          },
        },
        {
          text: "You are a furniture classifier. Classify the given image into EXACTLY ONE of these categories: 沙发, 床, 书桌, 餐桌, 茶几, 椅子, 柜子, 灯具, 装饰, 其他. Return ONLY the category name, nothing else. If it's a sofa, return 沙发. If it's a bed, return 床. If it's a desk, return 书桌. If it's a dining table, return 餐桌. If it's a coffee table, return 茶几. If it's a chair, return 椅子. If it's a cabinet/storage, return 柜子. If it's lighting, return 灯具. If it's decoration, return 装饰. Otherwise return 其他.",
        },
      ],
    });

    return normalizeFurnitureCategory(response.text?.trim()) ?? normalizedFallback ?? '其他';
  } catch (error) {
    console.error('Furniture classification failed:', error);
    return normalizedFallback ?? '其他';
  }
}

type AssetFallback = {
  storagePath: string;
  mimeType: string;
  name?: string;
  aspectRatio?: string | null;
  category?: string;
};

export async function generateRoomVisualization(
  userId: string,
  input: {
    roomImageId: string;
    furnitureItemIds: string[];
    customInstruction?: string | null;
    roomFallback?: AssetFallback;
    furnitureFallbacks?: AssetFallback[];
  }
) {
  const [roomResult, furnitureResult] = await Promise.all([
    query<RoomSourceRow>(
      `select id, name, storage_path, mime_type, aspect_ratio
       from room_images
       where id = $1 and user_id = $2`,
      [input.roomImageId, userId]
    ),
    query<FurnitureSourceRow>(
      `select id, name, category, storage_path, mime_type
       from furniture_items
       where user_id = $2 and id = any($1::text[])`,
      [input.furnitureItemIds, userId]
    ),
  ]);

  const roomRow = roomResult.rows[0];
  const furnitureRowsById = new Map(furnitureResult.rows.map((row) => [row.id, row]));
  const fallbackById = new Map(
    (input.furnitureFallbacks ?? []).map((fallback, index) => [input.furnitureItemIds[index], fallback] as const)
  );

  const room = roomRow
    ? { id: roomRow.id, name: roomRow.name, storagePath: roomRow.storage_path, mimeType: roomRow.mime_type, aspectRatio: roomRow.aspect_ratio }
    : input.roomFallback
      ? { id: input.roomImageId, name: input.roomFallback.name ?? 'room', storagePath: input.roomFallback.storagePath, mimeType: input.roomFallback.mimeType, aspectRatio: input.roomFallback.aspectRatio ?? null }
      : null;

  const furnitures = input.furnitureItemIds.map((furnitureItemId) => {
    const furnitureRow = furnitureRowsById.get(furnitureItemId);
    if (furnitureRow) {
      return {
        id: furnitureRow.id,
        name: furnitureRow.name,
        storagePath: furnitureRow.storage_path,
        mimeType: furnitureRow.mime_type,
        category: furnitureRow.category ?? '其他',
      };
    }

    const fallback = fallbackById.get(furnitureItemId);
    if (!fallback) {
      return null;
    }

    return {
      id: furnitureItemId,
      name: fallback.name ?? 'furniture',
      storagePath: fallback.storagePath,
      mimeType: fallback.mimeType,
      category: fallback.category ?? '其他',
    };
  });

  if (!room) {
    throw new Error('Room image not found.');
  }

  if (furnitures.length === 0 || furnitures.some((furniture) => !furniture)) {
    throw new Error('Furniture item not found.');
  }

  const resolvedFurnitures = furnitures.filter((furniture): furniture is NonNullable<typeof furniture> => Boolean(furniture));
  const [roomBase64, ...furnitureBase64List] = await Promise.all([
    downloadStorageAssetBase64(getStorageBucket('room'), room.storagePath),
    ...resolvedFurnitures.map((furniture) =>
      downloadStorageAssetBase64(getStorageBucket('furniture'), furniture.storagePath)
    ),
  ]);

  const response = await getGeminiClient().models.generateContent({
    model: GEMINI_IMAGE_MODEL,
    contents: {
      parts: [
        {
          inlineData: {
            data: roomBase64,
            mimeType: room.mimeType,
          },
        },
        ...resolvedFurnitures.map((furniture, index) => ({
          inlineData: {
            data: furnitureBase64List[index],
            mimeType: furniture.mimeType,
          },
        })),
        {
          text: buildVisualizationPrompt(
            resolvedFurnitures.map((furniture) => ({
              id: furniture.id,
              name: furniture.name,
              category: furniture.category,
            })),
            input.customInstruction
          ),
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: room.aspectRatio ?? '1:1',
        imageSize: '2K',
      },
    },
  });

  const imagePart = response.candidates?.[0]?.content?.parts?.find(
    (part) => part.inlineData?.data && part.inlineData.mimeType
  );

  if (!imagePart?.inlineData?.data || !imagePart.inlineData.mimeType) {
    throw new Error('Gemini did not return an image.');
  }

  return createHistoryItem(userId, {
    roomImageId: room.id,
    furnitureItemIds: resolvedFurnitures.map((furniture) => furniture.id),
    generatedDataUrl: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
    customInstruction: input.customInstruction ?? null,
    roomFallback: roomRow ? undefined : {
      name: room.name,
      storagePath: room.storagePath,
      mimeType: room.mimeType,
      fileSize: 0,
      aspectRatio: room.aspectRatio,
    },
    furnitureFallbacks: resolvedFurnitures.map((furniture) => ({
      name: furniture.name,
      storagePath: furniture.storagePath,
      mimeType: furniture.mimeType,
      fileSize: 0,
      category: furniture.category,
    })),
  });
}
