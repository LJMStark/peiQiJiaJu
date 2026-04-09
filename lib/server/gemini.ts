import 'server-only';

import { GoogleGenAI } from '@google/genai';
import { FURNITURE_CATEGORIES } from '@/lib/dashboard-types';
import { GEMINI_CLASSIFIER_MODEL, GEMINI_IMAGE_MODEL } from '@/lib/gemini-config';
import { buildVisualizationPrompt } from '@/lib/room-visualization';
import { normalizeGeminiError } from '@/lib/server/gemini-error';
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

type GeneratedImageSource = {
  storagePath: string;
  mimeType: string;
  aspectRatio: string | null;
};

const VALID_FURNITURE_CATEGORIES = new Set<string>(
  FURNITURE_CATEGORIES.filter((category) => category !== '全部')
);

const VIBE_ENHANCEMENT_PROMPT = `你是一位室内图像后期灯光与色彩专家。
我只提供 1 张已经完成构图的室内效果图。

【任务目标】
仅通过光影、色温、明暗层次和整体色彩分级来增强氛围感，让空间更温馨、更高级。
在不改变核心结构与主体家具的前提下，可增加必要的软装搭配（如地毯、挂画、绿植、抱枕、窗帘等）。

【硬性约束（必须遵守）】
1. 严禁改变或替换核心元素：原有家具、柜体、吊顶、墙面、地面、门窗等都必须保持原样。
2. 可新增软装，但不得删除、替换或重绘原有核心家具，不得改变其位置、比例、形状、朝向、数量和材质。
3. 严禁改变镜头机位、透视关系、构图和裁切范围。
4. 如果无法在不改变核心元素的前提下增强氛围，则保持原图不变。

【输出要求】
只返回一张处理后的图片。`;

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

  try {
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
  } catch (error) {
    throw normalizeGeminiError(error) ?? error;
  }
}

export async function enhanceRoomVibe(
  input: {
    sourceImage: GeneratedImageSource;
  }
) {
  const sourceBase64 = await downloadStoredImageBase64('generated', input.sourceImage.storagePath);

  try {
    const response = await getGeminiClient().models.generateContent({
      model: GEMINI_IMAGE_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              data: sourceBase64,
              mimeType: input.sourceImage.mimeType,
            },
          },
          {
            text: VIBE_ENHANCEMENT_PROMPT,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: input.sourceImage.aspectRatio ?? '1:1',
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
  } catch (error) {
    throw normalizeGeminiError(error) ?? error;
  }
}
