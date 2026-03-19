'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { Trash2 } from 'lucide-react';
import type { RoomImage } from '@/lib/dashboard-types';

type SwipeableRoomCardProps = {
  room: RoomImage;
  onDelete: (id: string) => void;
  onPreview: (url: string) => void;
};

export function SwipeableRoomCard({ room, onDelete, onPreview }: SwipeableRoomCardProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>(null);

  // 清理倒计时
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isConfirming) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      onDelete(room.id);
    } else {
      setIsConfirming(true);
      timeoutRef.current = setTimeout(() => {
        setIsConfirming(false);
      }, 3000);
    }
  };

  const handlePreviewClick = () => {
    if (isConfirming) {
      // 如果正处于确认状态，点击图片区域则取消确认
      setIsConfirming(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    } else {
      onPreview(room.imageUrl);
    }
  };

  return (
    <motion.div
      layout
      className="relative aspect-video rounded-xl overflow-hidden border border-zinc-200 shadow-sm group"
    >
      {/* 变暗遮罩：当处于确认状态时，略微压暗图片以突出删除按钮 */}
      <AnimatePresence>
        {isConfirming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 z-[5] pointer-events-none transition-opacity duration-300"
          />
        )}
      </AnimatePresence>

      <Image
        src={room.imageUrl}
        alt={room.name}
        fill
        className={`object-cover cursor-pointer transition-all duration-500 ${isConfirming ? 'scale-[1.02]' : 'group-hover:scale-105'}`}
        sizes="(max-width: 640px) 45vw, 200px"
        onClick={handlePreviewClick}
      />

      {/* 优雅的防误触二次确认按钮区域 */}
      {/* 使用 p-2 扩大实际触控热区到推荐的至少 44px 级别，而视觉上按钮依然很精巧 */}
      <div className="absolute top-0 right-0 p-2 z-10 flex justify-end">
        <motion.button
          layout
          onClick={handleDeleteClick}
          className={`flex items-center justify-center overflow-hidden shadow-sm backdrop-blur-md transition-colors ${
            isConfirming
              ? 'bg-red-500/95 text-white h-8 px-3.5 rounded-full gap-1.5'
              : 'bg-black/20 hover:bg-black/40 border border-white/20 text-white/90 h-7 w-7 rounded-full'
          }`}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          <motion.div layout className="flex-shrink-0">
            <Trash2 size={isConfirming ? 14 : 12} strokeWidth={isConfirming ? 2.5 : 2} />
          </motion.div>
          <AnimatePresence>
            {isConfirming && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="text-[11px] font-medium whitespace-nowrap overflow-hidden pr-0.5"
              >
                确认删除
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.div>
  );
}
