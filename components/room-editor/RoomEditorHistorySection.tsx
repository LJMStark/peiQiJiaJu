'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Clock, History } from 'lucide-react';
import Image from 'next/image';
import { formatBeijingTime } from '@/lib/beijing-time';
import { shouldBypassImageOptimization } from '@/lib/remote-images';
import { getDisplayInstruction } from './room-editor-prompt';
import { type RoomEditorController } from './use-room-editor-controller';

type RoomEditorHistorySectionProps = {
  controller: RoomEditorController;
};

export function RoomEditorHistorySection({ controller }: RoomEditorHistorySectionProps) {
  const {
    history,
    historyDisplayCount,
    loadHistoryItem,
    setHistoryDisplayCount,
  } = controller;

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="pt-10 mt-10 border-t border-zinc-200">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-600">
            <History size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
              生成历史
              <span className="bg-zinc-900 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {history.length}
              </span>
            </h3>
            <p className="text-sm text-zinc-500 mt-1">点击任意卡片即可恢复家具、指令与结果预览</p>
            <p className="text-xs text-amber-600 mt-1">生成结果保留 30 天，请及时下载保存。</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        <AnimatePresence>
          {history.slice(0, historyDisplayCount).map((item, index) => {
            const historyFurnitures = item.furnitures.length > 0 ? item.furnitures : [item.furniture];

            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={item.id}
                onClick={() => loadHistoryItem(item)}
                className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group flex flex-col"
              >
                <div className="relative aspect-[4/3] bg-zinc-100 overflow-hidden">
                  <Image
                    src={item.generatedImage.imageUrl}
                    alt="History result"
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    unoptimized={shouldBypassImageOptimization(item.generatedImage.imageUrl)}
                  />

                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                    <motion.div
                      initial={{ scale: 0.8 }}
                      whileInView={{ scale: 1 }}
                      className="bg-white/90 text-zinc-900 font-medium text-sm px-4 py-2 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300"
                    >
                      点击恢复此状态
                    </motion.div>
                  </div>

                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md text-zinc-700 text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5">
                    <Clock size={12} />
                    {formatBeijingTime(item.createdAt)}
                  </div>
                </div>

                <div className="p-4 bg-white flex-1 flex flex-col justify-between border-t border-zinc-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider w-12">家具</div>
                    <div className="flex items-center gap-2 bg-zinc-50 px-2 py-1.5 rounded-lg flex-1 border border-zinc-100 overflow-hidden group-hover:bg-zinc-100/50 transition-colors">
                      <div className="flex -space-x-2 shrink-0">
                        {historyFurnitures.slice(0, 3).map((furniture) => (
                          <div
                            key={`${item.id}-${furniture.id}`}
                            className="relative w-6 h-6 rounded-md overflow-hidden bg-white border border-zinc-200 shadow-sm"
                          >
                            <Image
                              src={furniture.imageUrl}
                              alt={furniture.name}
                              fill
                              className="object-contain p-0.5"
                              sizes="24px"
                              unoptimized={shouldBypassImageOptimization(furniture.imageUrl)}
                            />
                          </div>
                        ))}
                      </div>
                      <span className="text-sm font-medium text-zinc-700 truncate">
                        {historyFurnitures.length === 1
                          ? historyFurnitures[0].name
                          : `${historyFurnitures[0].name} 等 ${historyFurnitures.length} 件家具`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider w-12">场景</div>
                    <div className="flex items-center gap-2 bg-zinc-50 px-2 py-1.5 rounded-lg flex-1 border border-zinc-100 overflow-hidden group-hover:bg-zinc-100/50 transition-colors">
                      <div className="relative w-6 h-6 rounded-md overflow-hidden bg-zinc-200 shrink-0 shadow-sm">
                        <Image
                          src={item.roomImage.imageUrl}
                          alt={item.roomImage.name}
                          fill
                          className="object-cover"
                          sizes="24px"
                          unoptimized={shouldBypassImageOptimization(item.roomImage.imageUrl)}
                        />
                      </div>
                      <span className="text-sm text-zinc-600 truncate">
                        原始室内图
                      </span>
                    </div>
                  </div>

                  {getDisplayInstruction(item.customInstruction) && (
                    <div className="flex items-start gap-3 mt-3 pt-3 border-t border-zinc-100">
                      <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider w-12 mt-0.5">指令</div>
                      <div className="text-xs text-zinc-600 flex-1 line-clamp-2" title={getDisplayInstruction(item.customInstruction)}>
                        {getDisplayInstruction(item.customInstruction)}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {history.length > historyDisplayCount && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => setHistoryDisplayCount((previous) => previous + 12)}
            className="px-6 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-colors shadow-sm"
          >
            加载更多 ({Math.max(0, history.length - historyDisplayCount)} 条剩余)
          </button>
        </div>
      )}
    </div>
  );
}
