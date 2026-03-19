'use client';

import { useRef, useState, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';
import Image from 'next/image';
import { Trash2, X } from 'lucide-react';
import type { RoomImage } from '@/lib/dashboard-types';

const DELETE_THRESHOLD = -80;
const SNAP_OPEN = -88;

type SwipeableRoomCardProps = {
  room: RoomImage;
  onDelete: (id: string) => void;
  onPreview: (url: string) => void;
};

export function SwipeableRoomCard({ room, onDelete, onPreview }: SwipeableRoomCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const dragX = useMotionValue(0);

  const deleteOpacity = useTransform(dragX, [0, DELETE_THRESHOLD * 0.4, DELETE_THRESHOLD], [0, 0.6, 1]);
  const deleteScale = useTransform(dragX, [0, DELETE_THRESHOLD * 0.5, DELETE_THRESHOLD], [0.5, 0.8, 1]);
  const overlayOpacity = useTransform(dragX, [0, DELETE_THRESHOLD], [0, 0.15]);

  const constraintsRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = useCallback((_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    const shouldOpen = info.offset.x < DELETE_THRESHOLD * 0.6 || info.velocity.x < -300;

    if (shouldOpen) {
      setIsRevealed(true);
      void animate(dragX, SNAP_OPEN, {
        type: 'spring',
        stiffness: 500,
        damping: 35,
      });
    } else {
      setIsRevealed(false);
      void animate(dragX, 0, {
        type: 'spring',
        stiffness: 500,
        damping: 35,
      });
    }
  }, [dragX]);

  const handleDeleteClick = useCallback(() => {
    setIsDeleting(true);
    void animate(dragX, -400, {
      type: 'spring',
      stiffness: 400,
      damping: 30,
    });
    setTimeout(() => onDelete(room.id), 250);
  }, [dragX, onDelete, room.id]);

  const resetPosition = useCallback(() => {
    setIsRevealed(false);
    void animate(dragX, 0, {
      type: 'spring',
      stiffness: 500,
      damping: 35,
    });
  }, [dragX]);

  return (
    <div
      ref={constraintsRef}
      className="relative aspect-video rounded-xl overflow-hidden border border-zinc-200 shadow-sm"
      style={{ touchAction: 'pan-y' }}
    >
      {/* Delete action zone - revealed behind the card */}
      <motion.div
        className="absolute inset-0 flex items-center justify-end z-0"
        style={{
          background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 50%, #fca5a5 100%)',
        }}
      >
        <motion.button
          onClick={handleDeleteClick}
          style={{ opacity: deleteOpacity, scale: deleteScale }}
          className="flex flex-col items-center justify-center gap-1 w-20 h-full text-red-600 active:text-red-800"
        >
          <Trash2 size={20} strokeWidth={2.2} />
          <span className="text-[10px] font-semibold tracking-wide">删除</span>
        </motion.button>
      </motion.div>

      {/* Red overlay that intensifies as you swipe */}
      <motion.div
        className="absolute inset-0 bg-red-500 pointer-events-none z-[5]"
        style={{ opacity: overlayOpacity }}
      />

      {/* Swipeable card content */}
      <motion.div
        className="relative w-full h-full z-[2] bg-white"
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -160, right: 0 }}
        dragElastic={{ left: 0.15, right: 0.5 }}
        dragMomentum={false}
        style={{ x: dragX }}
        onDragEnd={handleDragEnd}
        onTap={() => {
          if (isRevealed) {
            resetPosition();
          }
        }}
      >
        <Image
          src={room.imageUrl}
          alt={room.name}
          fill
          className="object-cover cursor-pointer"
          sizes="(max-width: 640px) 45vw, 200px"
          onClick={() => {
            if (!isRevealed) {
              onPreview(room.imageUrl);
            }
          }}
        />

        {/* Desktop hover delete button - hidden on touch */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(room.id); }}
          className="absolute top-1.5 right-1.5 bg-white/90 backdrop-blur-md text-red-500 p-1 rounded-md hidden sm:block sm:opacity-0 sm:group-hover:opacity-100 transition-all hover:bg-red-50 hover:scale-110 shadow-sm z-10"
        >
          <X size={14} />
        </button>
      </motion.div>

      {/* Swipe hint indicator - pulsing on first card only */}
      {!isDeleting && !isRevealed && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 z-[3] sm:hidden pointer-events-none">
          <div className="w-1 h-6 rounded-full bg-zinc-400/30" />
        </div>
      )}
    </div>
  );
}
