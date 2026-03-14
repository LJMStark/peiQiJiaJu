'use client';

import { AnimatePresence, motion } from 'motion/react';
import { MessageSquareText, Sparkles, X } from 'lucide-react';

const FEEDBACK_TAGS = ['透视不对', '阴影太假', '大小比例不协调', '遮挡关系错误', '没有倒影', '位置放错了'];

type FeedbackModalProps = {
  isOpen: boolean;
  onClose: () => void;
  feedbackText: string;
  onFeedbackChange: (text: string) => void;
  onSubmit: () => void;
};

export function FeedbackModal({
  isOpen,
  onClose,
  feedbackText,
  onFeedbackChange,
  onSubmit,
}: FeedbackModalProps) {
  const appendTag = (tag: string) => {
    onFeedbackChange(feedbackText ? `${feedbackText}，${tag}` : tag);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <MessageSquareText size={20} className="text-indigo-600" />
                提供优化反馈
              </h3>
              <button
                onClick={onClose}
                className="text-zinc-400 hover:text-zinc-600 transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-zinc-600 mb-4">
                如果生成的图像在透视、光影或摆放位置上不够理想，请告诉我们具体问题。您的反馈将直接附加到下一次生成的提示词中，帮助 AI 更精准地理解您的意图。
              </p>
              <div className="mb-4">
                <div className="flex flex-wrap gap-2 mb-3">
                  {FEEDBACK_TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => appendTag(tag)}
                      className="text-xs px-3 py-1.5 bg-zinc-50 border border-zinc-200 text-zinc-600 rounded-full hover:bg-zinc-100 hover:border-zinc-300 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <textarea
                  value={feedbackText}
                  onChange={(e) => onFeedbackChange(e.target.value)}
                  placeholder="例如：请把沙发的阴影调得更柔和一些，并且确保它完全贴合木地板的透视线..."
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none h-32 text-sm"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={onSubmit}
                  disabled={!feedbackText.trim()}
                  className="flex-1 py-2.5 rounded-xl font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} />
                  应用反馈并重新生成
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
