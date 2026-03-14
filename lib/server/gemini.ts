import 'server-only';

import { GoogleGenAI } from '@google/genai';
import { FURNITURE_CATEGORIES } from '@/lib/dashboard-types';
import { query } from '@/lib/db';
import { GEMINI_CLASSIFIER_MODEL, GEMINI_IMAGE_MODEL } from '@/lib/gemini-config';
import { createHistoryItem } from '@/lib/server/assets';
import { getStorageBucket } from '@/lib/storage-config';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type FurnitureSourceRow = {
  id: string;
  name: string;
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

function buildGenerationPrompt(customInstruction: string | null | undefined) {
  let prompt = `你是一位顶级的室内设计师和高级图像合成专家。
我按顺序提供了两张图片：
[图片 1]：基础场景（室内房间实景图）。
[图片 2]：目标物体（需要放入房间的家具参考图）。

【核心任务】
以 [图片 1] 为绝对的基础背景，将 [图片 2] 中的主体家具完美、无痕地合成到 [图片 1] 中。
严禁改变 [图片 1] 的房间结构、墙壁、地板和其他不相关的背景元素！

【高级合成规范】
1. 空间透视与比例 (Perspective & Scale)：
   - 严格遵循 [图片 1] 的空间透视灭点（Vanishing Points）。
   - 确保新家具的三维透视形变与房间的地板、墙面完全吻合。
   - 准确评估房间的物理尺度，使新家具的比例（长宽高）与周围环境（如门、窗、其他家具）保持绝对协调。
2. 光影与材质 (Lighting & Shadows)：
   - 深度分析 [图片 1] 的主光源方向、色温和环境光（Ambient Light）。
   - 为新家具重新生成符合房间光源的受光面、背光面和高光。
   - 必须在家具底部和接触面生成准确的接触阴影（Contact Shadows）和投射阴影（Cast Shadows），阴影的软硬程度需与房间现有阴影一致。
   - 如果地板是反光材质（如瓷砖、抛光木地板），必须生成新家具的真实倒影。
3. 遮挡与融合 (Occlusion & Blending)：
   - 妥善处理新家具与房间原有物品的前后遮挡关系。
   - 边缘融合必须自然，无明显的抠图白边或生硬过渡。
4. 智能替换与摆放 (Placement)：
   - 优先识别并替换 [图片 1] 中与 [图片 2] 功能相似的旧家具。
   - 如果是新增家具，请选择符合室内设计美学和动线逻辑的合理位置。`;

  const normalizedInstruction = customInstruction?.trim();
  if (normalizedInstruction) {
    prompt += `\n\n【用户的特别指示与反馈】\n${normalizedInstruction}`;
  }

  return prompt;
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
  userId: string,
  input: {
    roomImageId: string;
    furnitureItemId: string;
    customInstruction?: string | null;
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
      `select id, name, storage_path, mime_type
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

  const [roomBase64, furnitureBase64] = await Promise.all([
    downloadStorageAssetBase64(getStorageBucket('room'), room.storage_path),
    downloadStorageAssetBase64(getStorageBucket('furniture'), furniture.storage_path),
  ]);

  const response = await getGeminiClient().models.generateContent({
    model: GEMINI_IMAGE_MODEL,
    contents: {
      parts: [
        {
          inlineData: {
            data: roomBase64,
            mimeType: room.mime_type,
          },
        },
        {
          inlineData: {
            data: furnitureBase64,
            mimeType: furniture.mime_type,
          },
        },
        {
          text: buildGenerationPrompt(input.customInstruction),
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: room.aspect_ratio ?? '1:1',
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
    furnitureItemId: furniture.id,
    generatedDataUrl: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
    customInstruction: input.customInstruction ?? null,
  });
}
