'use client';

import { useId } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import type { FurnitureItem } from '@/lib/dashboard-types';
import { shouldBypassImageOptimization } from '@/lib/remote-images';
import { useDialogAccessibility } from '@/components/use-dialog-accessibility';

type FurniturePreviewModalProps = {
  furniture: FurnitureItem;
  onClose: () => void;
};

export function FurniturePreviewModal({ furniture, onClose }: FurniturePreviewModalProps) {
  const titleId = useId();
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
        className="relative w-full max-w-3xl aspect-square md:aspect-video bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
          aria-label="关闭家具预览"
        >
          <X size={20} />
        </button>
        <Image
          src={furniture.imageUrl}
          alt={furniture.name}
          fill
          className="object-contain p-4"
          sizes="(max-width: 768px) 100vw, 768px"
          unoptimized={shouldBypassImageOptimization(furniture.imageUrl)}
        />
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 pt-12">
          <h3 id={titleId} className="text-white text-xl font-medium">{furniture.name}</h3>
        </div>
      </div>
    </div>
  );
}
