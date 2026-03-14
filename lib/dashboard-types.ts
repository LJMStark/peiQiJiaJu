export const FURNITURE_CATEGORIES = [
  '全部',
  '沙发',
  '床',
  '书桌',
  '餐桌',
  '茶几',
  '椅子',
  '柜子',
  '灯具',
  '装饰',
  '其他',
] as const;

export const ROOM_ASPECT_RATIOS = [
  { name: '1:1', value: 1 },
  { name: '4:3', value: 4 / 3 },
  { name: '3:4', value: 3 / 4 },
  { name: '16:9', value: 16 / 9 },
  { name: '9:16', value: 9 / 16 },
] as const;

export type FurnitureCategory = (typeof FURNITURE_CATEGORIES)[number];
export type RoomAspectRatio = (typeof ROOM_ASPECT_RATIOS)[number]['name'];

export interface StoredImageAsset {
  id: string;
  name: string;
  storagePath: string;
  imageUrl: string;
  mimeType: string;
  fileSize: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface FurnitureItem extends StoredImageAsset {
  category: string;
}

export interface RoomImage extends StoredImageAsset {
  aspectRatio?: RoomAspectRatio;
}

export interface GeneratedImageAsset extends StoredImageAsset {}

export interface HistoryItem {
  id: string;
  roomImage: RoomImage;
  furniture: FurnitureItem;
  generatedImage: GeneratedImageAsset;
  customInstruction?: string;
  createdAt: string;
}

export interface PlacedFurniture {
  instanceId: string;
  furniture: FurnitureItem;
  x: number;
  y: number;
  scale: number;
}

export type AssetUploadKind = 'furniture' | 'room' | 'generated';
