'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { Download, X } from 'lucide-react';
import { shouldBypassImageOptimization } from '@/lib/remote-images';

type ImageLightboxProps = {
  imageUrl: string;
  downloadUrl?: string | null;
  onClose: () => void;
};

function triggerDownload(downloadUrl: string): void {
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export function ImageLightbox({ imageUrl, downloadUrl, onClose }: ImageLightboxProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="图片全屏预览"
    >
      <div
        className="relative w-full max-w-5xl aspect-video bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
          aria-label="关闭预览"
        >
          <X size={20} />
        </button>
        <Image
          src={imageUrl}
          alt="Generated visualization"
          fill
          className="object-contain p-2"
          sizes="(max-width: 1280px) 100vw, 1280px"
          unoptimized={shouldBypassImageOptimization(imageUrl)}
        />
        {downloadUrl ? (
          <div className="absolute bottom-4 right-4 z-10">
            <button
              className="bg-white/90 backdrop-blur-md text-zinc-700 hover:text-indigo-600 px-4 py-2 rounded-full shadow-lg border border-zinc-200 flex items-center gap-2 text-sm font-medium transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                triggerDownload(downloadUrl);
              }}
            >
              <Download size={16} />
              下载图片
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
