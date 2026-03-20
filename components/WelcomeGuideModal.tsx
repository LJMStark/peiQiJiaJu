'use client';

import { useState, useEffect } from 'react';
import { Sofa, Image as ImageIcon, Sparkles, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type WelcomeGuideModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
};

export function WelcomeGuideModal({ isOpen, onClose, userName }: WelcomeGuideModalProps) {
  const [activeStep, setActiveStep] = useState(0);

  // 阻止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  const steps = [
    {
      icon: Sofa,
      title: '管理家具图册',
      description: '首先，在「家具图册」模块上传您的产品图片。系统会自动识别并提取您的家具主体。',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
    {
      icon: ImageIcon,
      title: '上传室内照片',
      description: '进入「室内编辑器」，上传客户的毛坯房或真实空间的现场照片。您可以保存多张房间图，并随时切换当前要生成的室内场景。',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      icon: Sparkles,
      title: 'AI 智能融合',
      description: '选中家具与房间，可附加“替换原有沙发”等文字指令。点击生成，AI 将自动分析透视和光影，为您合成高逼真度的空间效果图！',
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* 背景蒙层 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* 弹窗主体 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden z-10"
        >
          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-colors z-20"
          >
            <X size={20} />
          </button>

          <div className="flex flex-col md:flex-row h-full">
            {/* 左侧：欢迎文案 */}
            <div className="bg-zinc-900 text-white p-8 md:w-2/5 flex flex-col justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  欢迎来到<br />佩奇家具
                </h2>
                <p className="text-zinc-400 text-sm leading-relaxed mt-4">
                  {userName ? `你好，${userName}！` : '你好！'}
                  我们为您准备了 10 张免费的 AI 效果图生成额度。
                  <br /><br />
                  使用前，请花 1 分钟了解我们的核心工作流，助您更高效地谈单。
                </p>
              </div>
              <div className="mt-8">
                <div className="flex gap-2">
                  {steps.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1 rounded-full flex-1 transition-all duration-300 ${
                        idx <= activeStep ? 'bg-indigo-500' : 'bg-zinc-700'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-zinc-500 mt-2 font-medium">
                  步骤 {activeStep + 1} / {steps.length}
                </p>
              </div>
            </div>

            {/* 右侧：步骤详情 */}
            <div className="p-8 md:w-3/5 flex flex-col justify-center bg-zinc-50/50">
              <div className="min-h-[220px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col h-full"
                  >
                    <div className={`w-14 h-14 rounded-2xl ${steps[activeStep].bgColor} flex items-center justify-center mb-6`}>
                      {(() => {
                        const Icon = steps[activeStep].icon;
                        return <Icon className={`w-7 h-7 ${steps[activeStep].color}`} />;
                      })()}
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 mb-3">
                      {steps[activeStep].title}
                    </h3>
                    <p className="text-zinc-600 leading-relaxed">
                      {steps[activeStep].description}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="mt-8 flex items-center justify-end gap-3 pt-6 border-t border-zinc-100">
                {activeStep > 0 && (
                  <button
                    onClick={() => setActiveStep((prev) => prev - 1)}
                    className="px-4 py-2.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
                  >
                    上一步
                  </button>
                )}
                
                {activeStep < steps.length - 1 ? (
                  <button
                    onClick={() => setActiveStep((prev) => prev + 1)}
                    className="px-6 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-xl hover:bg-zinc-800 transition-colors flex items-center gap-2"
                  >
                    下一步
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm shadow-indigo-600/20"
                  >
                    开始体验
                    <Sparkles size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
