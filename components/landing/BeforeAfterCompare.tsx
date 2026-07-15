'use client';

import Image from 'next/image';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useClientReady } from '@/components/landing/use-client-ready';

const LABEL_ID = 'landing-before-after-label';
const RANGE_ID = 'landing-before-after-range';

type BeforeAfterCompareProps = {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt: string;
  afterAlt: string;
  splitComposite?: boolean;
  className?: string;
};

export function BeforeAfterCompare({
  beforeSrc,
  afterSrc,
  beforeAlt,
  afterAlt,
  splitComposite = false,
  className = '',
}: BeforeAfterCompareProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(52);
  const [containerWidth, setContainerWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  const ready = useClientReady();
  const reduceMotion = useReducedMotion();
  const canPulse = ready && reduceMotion !== true && !dragging;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => setContainerWidth(el.clientWidth);
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(96, Math.max(4, next)));
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    updateFromClientX(event.clientX);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    updateFromClientX(event.clientX);
  };

  const stopDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
  };

  return (
    <div className={className}>
      <div className="border border-linen bg-white p-2 shadow-lg shadow-ink/5 sm:p-3">
        <div
          ref={containerRef}
          role="group"
          aria-labelledby={LABEL_ID}
          className="relative aspect-[4/3] w-full cursor-col-resize touch-pan-y overflow-hidden bg-cream select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
        >
          <Image
            src={afterSrc}
            alt={afterAlt}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 56vw"
            style={splitComposite ? { transform: 'scale(2)', transformOrigin: 'right center' } : undefined}
          />

          <div
            className="absolute inset-y-0 left-0 overflow-hidden"
            style={{ width: `${position}%` }}
            aria-hidden="true"
          >
            <div className="relative h-full" style={{ width: containerWidth || '100%' }}>
              <Image
                src={beforeSrc}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 56vw"
                style={splitComposite ? { transform: 'scale(2)', transformOrigin: 'left center' } : undefined}
              />
            </div>
          </div>

          <div
            className="absolute inset-y-0 z-10 w-px bg-ink"
            style={{ left: `${position}%` }}
            aria-hidden="true"
          >
            <motion.div
              className="absolute top-1/2 left-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center border border-ink bg-paper shadow-md"
              animate={canPulse ? { scale: [1, 1.06, 1] } : { scale: 1 }}
              transition={
                canPulse
                  ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: 0 }
              }
            >
              <span className="font-display text-xs font-semibold text-ink">拖</span>
            </motion.div>
          </div>

          <span className="absolute left-3 top-3 border border-linen bg-paper/95 px-2.5 py-1 font-mono text-[11px] tracking-widest text-ink">
            空房间
          </span>
          <span className="absolute right-3 top-3 bg-clay px-2.5 py-1 font-mono text-[11px] tracking-widest text-paper">
            配齐后
          </span>
        </div>
      </div>

      <label id={LABEL_ID} className="sr-only" htmlFor={RANGE_ID}>
        拖动对比空房间与配齐后的效果
      </label>
      <input
        id={RANGE_ID}
        type="range"
        min={4}
        max={96}
        value={position}
        onChange={(event) => setPosition(Number(event.target.value))}
        className="mt-4 w-full accent-clay"
        aria-valuemin={4}
        aria-valuemax={96}
        aria-valuenow={Math.round(position)}
      />

      <p className="sr-only">{beforeAlt}；{afterAlt}</p>
    </div>
  );
}
