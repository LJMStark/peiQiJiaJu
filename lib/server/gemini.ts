import 'server-only';

import { GoogleGenAI } from '@google/genai';
import { FURNITURE_CATEGORIES } from '@/lib/dashboard-types';
import { GEMINI_CLASSIFIER_MODEL, GEMINI_IMAGE_MODEL } from '@/lib/gemini-config';
import { buildVisualizationPrompt } from '@/lib/room-visualization';
import { downloadStoredImageBase64 } from '@/lib/server/storage';

type FurnitureSource = {
  id: string;
  name: string;
  category: string;
  storagePath: string;
  mimeType: string;
};

type RoomSource = {
  id: string;
  name: string;
  storagePath: string;
  mimeType: string;
  aspectRatio: string | null;
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

export async function generateRoomVisualization(
  input: {
    roomImage: RoomSource;
    furnitureItems: readonly FurnitureSource[];
    customInstruction?: string | null;
  }
) {
  if (input.furnitureItems.length === 0) {
    throw new Error('Furniture item not found.');
  }

  const [roomBase64, ...furnitureBase64List] = await Promise.all([
    downloadStoredImageBase64('room', input.roomImage.storagePath),
    ...input.furnitureItems.map((furniture) =>
      downloadStoredImageBase64('furniture', furniture.storagePath)
    ),
  ]);

  const response = await getGeminiClient().models.generateContent({
    model: GEMINI_IMAGE_MODEL,
    contents: {
      parts: [
        {
          inlineData: {
            data: roomBase64,
            mimeType: input.roomImage.mimeType,
          },
        },
        ...input.furnitureItems.map((furniture, index) => ({
          inlineData: {
            data: furnitureBase64List[index],
            mimeType: furniture.mimeType,
          },
        })),
        {
          text: buildVisualizationPrompt(
            input.furnitureItems.map((furniture) => ({
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
        aspectRatio: input.roomImage.aspectRatio ?? '1:1',
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

  return {
    generatedDataUrl: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
    mimeType: imagePart.inlineData.mimeType,
  };
}
