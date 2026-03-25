'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Loader2, Sparkles, X } from 'lucide-react';

type NewProjectConfirmModalProps = {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function NewProjectConfirmModal({
  isOpen,
  isSubmitting,
  onClose,
  onConfirm,
}: NewProjectConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={isSubmitting ? undefined : onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 p-5">
              <h3 className="flex items-center gap-2 text-lg font-bold text-zinc-900">
                <Sparkles size={20} className="text-zinc-700" />
                新建项目
              </h3>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="p-1 text-zinc-400 transition-colors hover:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="关闭新建项目确认框"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-5 p-5">
              <p className="text-sm leading-6 text-zinc-600">
                这会清空当前室内图、已选家具和本次生成结果，历史记录会保留。
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl bg-zinc-100 py-2.5 font-medium text-zinc-700 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isSubmitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-900 py-2.5 font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {isSubmitting ? '清空中...' : '开始新项目'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
