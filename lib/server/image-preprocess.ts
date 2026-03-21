import 'server-only';

import sharp from 'sharp';

/**
 * 图片预处理配置。
 * 长边限制 1536px：Gemini 按 768x768 切片，1536 最多 4 tiles，Token 性价比最优。
 */
const MAX_DIMENSION = 1536;
const WEBP_QUALITY = 80;

type PreprocessResult = {
  buffer: Buffer;
  mimeType: 'image/webp';
  fileSize: number;
  width: number;
  height: number;
};

/**
 * 对用户上传的图片做服务端预处理：
 * 1. 自动旋转（按 EXIF Orientation）
 * 2. 等比缩放（长边 <= 1536px，不放大）
 * 3. 统一输出 WebP（quality 80%）
 * 4. 剥离 EXIF 元数据（节省体积、保护隐私）
 */
export async function preprocessImage(input: Buffer): Promise<PreprocessResult> {
  const { data, info } = await sharp(input)
    .rotate()
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer({ resolveWithObject: true });

  if (!info.width || !info.height) {
    throw new Error('Failed to determine normalized image dimensions.');
  }

  return {
    buffer: data,
    mimeType: 'image/webp',
    fileSize: data.byteLength,
    width: info.width,
    height: info.height,
  };
}
