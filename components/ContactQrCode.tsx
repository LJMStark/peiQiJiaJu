'use client';

import type { JSX } from 'react';
import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';

export function ContactQrCode(): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute bottom-16 left-0 bg-white rounded-2xl shadow-2xl border border-zinc-100 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-3 flex items-center justify-between">
              <span className="text-white text-sm font-medium">客服微信</span>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-white/80 hover:text-white p-0.5 rounded-full hover:bg-white/20 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* QR Code */}
            <div className="p-4 flex flex-col items-center">
              <div className="w-40 h-40 relative rounded-xl overflow-hidden border border-zinc-100">
                <Image
                  src="/customer-service-qr.png"
                  alt="客服微信二维码"
                  fill
                  className="object-contain p-1"
                  sizes="160px"
                />
              </div>
              <p className="text-zinc-500 text-xs mt-2 text-center">扫码添加客服微信</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating trigger button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-colors ${
          isExpanded
            ? 'bg-zinc-700 text-white'
            : 'bg-green-500 text-white hover:bg-green-600'
        }`}
        title="联系客服"
      >
        {isExpanded ? <X size={20} /> : <MessageCircle size={20} />}
      </motion.button>
    </div>
  );
}
