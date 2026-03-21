'use client';

import type { RoomAspectRatio } from '@/lib/dashboard-types';
import { inferRoomAspectRatioFromDimensions } from '@/lib/room-aspect-ratio';

function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Failed to read image data.'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image data.'));
    reader.readAsDataURL(blob);
  });
}

export async function blobToBase64(blob: Blob) {
  const dataUrl = await readBlobAsDataUrl(blob);
  const [, base64 = ''] = dataUrl.split(',', 2);
  return base64;
}

export async function fileToBase64(file: File) {
  return blobToBase64(file);
}

export async function imageUrlToBase64(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to load image from storage.');
  }

  const blob = await response.blob();
  return blobToBase64(blob);
}

export async function inferAspectRatio(file: File): Promise<RoomAspectRatio> {
  const dataUrl = await readBlobAsDataUrl(file);

  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(inferRoomAspectRatioFromDimensions({
      width: image.width,
      height: image.height,
    }));
    image.onerror = () => reject(new Error('Failed to read image dimensions.'));
    image.src = dataUrl;
  });
}
