'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useClientReady } from '@/components/landing/use-client-ready';

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
};

export function Reveal({
  children,
  className = '',
  delay = 0,
  y = 28,
  once = true,
}: RevealProps) {
  const ready = useClientReady();
  const reduceMotion = useReducedMotion();
  const canAnimate = ready && reduceMotion !== true;

  // SSR + first client paint: plain div (no Motion inline styles) so markup matches.
  if (!canAnimate) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-8% 0px' }}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
