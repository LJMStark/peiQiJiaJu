'use client';

import Image from 'next/image';
import { Download, X } from 'lucide-react';
import { shouldBypassImageOptimization } from '@/lib/remote-images';
import { useDialogAccessibility } from '@/components/use-dialog-accessibility';

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
  const dialogRef = useDialogAccessibility<HTMLDivElement>({
    isOpen: true,
    onClose,
    lockScroll: true,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-5xl aspect-video bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="图片全屏预览"
        tabIndex={-1}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
          aria-label="关闭预览"
        >
          <X size={20} />
        </button>
        <Image
          src={imageUrl}
          alt="生成后的室内效果图"
          fill
          className="object-contain p-2"
          sizes="(max-width: 1280px) 100vw, 1280px"
          unoptimized={shouldBypassImageOptimization(imageUrl)}
        />
        {downloadUrl ? (
          <div className="absolute bottom-4 right-4 z-10">
            <button
              type="button"
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
