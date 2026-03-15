'use client';

import type { JSX } from 'react';
import { X, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';

type UsageLimitModalProps = {
  type: 'free_limit' | 'vip_expired';
  isOpen: boolean;
  onClose: () => void;
};

export function UsageLimitModal({ type, isOpen, onClose }: UsageLimitModalProps): JSX.Element | null {
  const title = type === 'free_limit' ? '免费额度已用完' : '会员套餐已到期';
  const description =
    type === 'free_limit'
      ? '您的免费生图额度（10 张）已全部用完。如需继续使用，请添加客服微信咨询购买会员套餐。'
      : '您的会员套餐已到期，生图功能暂时不可用。如需续费，请添加客服微信咨询。';
  const actionText = type === 'free_limit' ? '咨询购买' : '咨询续费';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 text-zinc-400 hover:text-zinc-600 p-1 rounded-full hover:bg-zinc-100 transition-colors"
            >
              <X size={20} />
            </button>

            {/* Header gradient */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-400 px-6 pt-8 pb-6 text-center text-white">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MessageCircle size={28} />
              </div>
              <h3 className="text-xl font-bold mb-1">{title}</h3>
              <p className="text-amber-50 text-sm leading-relaxed opacity-90">{description}</p>
            </div>

            {/* QR Code */}
            <div className="px-6 py-6 flex flex-col items-center">
              <div className="w-52 h-52 relative rounded-2xl overflow-hidden border-2 border-zinc-100 shadow-sm">
                <Image
                  src="/customer-service-qr.png"
                  alt="客服微信二维码"
                  fill
                  className="object-contain p-2"
                  sizes="208px"
                  priority
                />
              </div>
              <p className="text-zinc-500 text-xs mt-3 text-center">
                长按识别或扫描二维码添加客服微信
              </p>
              <p className="text-amber-600 text-sm font-medium mt-1">{actionText}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
