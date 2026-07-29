import 'server-only';

import { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_UPLOAD_SIZE_BYTES } from '../storage-config.ts';
import { buildVisualizationPrompt } from '../room-visualization.ts';
import { createDuomiImageClient } from './duomi-image-client.ts';
import { createSignedImageUrl } from './storage.ts';

type FurnitureSource = {
  id: string;
  name: string;
  category: string;
  storagePath: string;
};

type RoomSource = {
  storagePath: string;
  aspectRatio: string | null;
};

type GeneratedImageSource = {
  storagePath: string;
  aspectRatio: string | null;
};

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

function getDuomiClient() {
  return createDuomiImageClient({
    apiKey: process.env.DUOMI_API ?? '',
    apiBase: process.env.DUOMI_API_BASE,
    model: process.env.DUOMI_IMAGE_MODEL,
  });
}

async function downloadGeneratedImage(imageUrl: string) {
  const response = await fetch(imageUrl, {
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    throw new Error(`下载 Duomi 生图结果失败: ${response.status}`);
  }

  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_UPLOAD_SIZE_BYTES) {
    throw new Error('Duomi 生图结果超过 10MB 上传限制。');
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength === 0) {
    throw new Error('Duomi 生图结果为空。');
  }
  if (buffer.byteLength > MAX_IMAGE_UPLOAD_SIZE_BYTES) {
    throw new Error('Duomi 生图结果超过 10MB 上传限制。');
  }

  const mimeType = response.headers
    .get('content-type')
    ?.split(';')[0]
    ?.trim()
    .toLowerCase();
  if (!mimeType || !ALLOWED_IMAGE_MIME_TYPES.includes(
    mimeType as (typeof ALLOWED_IMAGE_MIME_TYPES)[number]
  )) {
    throw new Error(`Duomi 返回了不支持的图片类型: ${mimeType ?? 'missing'}`);
  }

  return {
    generatedDataUrl: `data:${mimeType};base64,${buffer.toString('base64')}`,
    mimeType,
  };
}

async function generateFromReferences(input: {
  prompt: string;
  imageUrls: readonly string[];
  aspectRatio: string | null;
}) {
  const client = getDuomiClient();
  const taskId = await client.createImageEditTask({
    prompt: input.prompt,
    imageUrls: input.imageUrls,
    aspectRatio: input.aspectRatio ?? '1:1',
    imageSize: '2K',
  });
  const resultUrl = await client.waitForImage(taskId);
  return downloadGeneratedImage(resultUrl);
}

export async function generateRoomVisualization(input: {
  roomImage: RoomSource;
  furnitureItems: readonly FurnitureSource[];
  customInstruction?: string | null;
}) {
  if (input.furnitureItems.length === 0) {
    throw new Error('Furniture item not found.');
  }

  const imageUrls = await Promise.all([
    createSignedImageUrl('room', input.roomImage.storagePath),
    ...input.furnitureItems.map((furniture) =>
      createSignedImageUrl('furniture', furniture.storagePath)
    ),
  ]);

  return generateFromReferences({
    prompt: buildVisualizationPrompt(
      input.furnitureItems.map((furniture) => ({
        id: furniture.id,
        name: furniture.name,
        category: furniture.category,
      })),
      input.customInstruction
    ),
    imageUrls,
    aspectRatio: input.roomImage.aspectRatio,
  });
}

export async function enhanceRoomVibe(input: {
  sourceImage: GeneratedImageSource;
}) {
  const sourceUrl = await createSignedImageUrl('generated', input.sourceImage.storagePath);

  return generateFromReferences({
    prompt: VIBE_ENHANCEMENT_PROMPT,
    imageUrls: [sourceUrl],
    aspectRatio: input.sourceImage.aspectRatio,
  });
}
