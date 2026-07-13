'use client';

import { useState } from 'react';
import { Clock, History } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { formatBeijingTime } from '@/lib/beijing-time';
import { shouldBypassImageOptimization } from '@/lib/remote-images';
import { getDisplayInstruction } from './room-editor-prompt';
import type { RoomEditorController } from './use-room-editor-controller';

type RoomEditorHistorySectionProps = {
  controller: RoomEditorController;
};

export function RoomEditorHistorySection({ controller }: RoomEditorHistorySectionProps) {
  const { history, historyNextCursor, isLoadingMoreHistory, loadHistoryItem, loadMoreHistory } = controller;
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleHistory = isExpanded ? history : history.slice(0, 4);

  return (
    <section className="border-t border-zinc-200 pt-6 sm:pt-8" aria-labelledby="room-editor-history-title">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id="room-editor-history-title" className="flex items-center gap-2 text-lg font-semibold text-zinc-900 sm:text-xl">
            <History aria-hidden="true" size={20} className="text-zinc-500" />
            最近历史
            {history.length > 0 ? <span className="text-sm font-normal text-zinc-500">{history.length} 条已加载</span> : null}
          </h3>
          <p className="mt-1 text-sm text-zinc-600">点击结果可以恢复当时的室内图、家具和补充要求。</p>
        </div>
        {history.length > 4 ? (
          <Button variant="secondary" size="compact" onClick={() => setIsExpanded((current) => !current)}>
            {isExpanded ? '收起历史' : '展开全部历史'}
          </Button>
        ) : null}
      </div>

      {history.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-5 py-8 text-center text-sm text-zinc-600">
          生成后的效果图会自动保存在这里。
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visibleHistory.map((item) => {
            const furnitures = item.furnitures.length > 0 ? item.furnitures : [item.furniture];
            const instruction = getDisplayInstruction(item.customInstruction);

            return (
              <button
                type="button"
                key={item.id}
                onClick={() => loadHistoryItem(item)}
                className="group overflow-hidden rounded-xl border border-zinc-200 bg-white text-left transition-colors hover:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <span className="relative block aspect-[4/3] overflow-hidden bg-zinc-100">
                  <Image
                    src={item.generatedImage.imageUrl}
                    alt="历史生成结果"
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    unoptimized={shouldBypassImageOptimization(item.generatedImage.imageUrl)}
                  />
                  <span className="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-white/95 px-2 py-1 text-xs text-zinc-700 shadow-sm">
                    <Clock aria-hidden="true" size={12} />
                    {formatBeijingTime(item.createdAt)}
                  </span>
                </span>
                <span className="block p-3">
                  <span className="block truncate text-sm font-medium text-zinc-900">
                    {furnitures.length === 1 ? furnitures[0].name : `${furnitures[0].name} 等 ${furnitures.length} 件家具`}
                  </span>
                  <span className="mt-1 block truncate text-xs text-zinc-500">{instruction || '未填写补充要求'}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {isExpanded && historyNextCursor ? (
        <div className="mt-5 flex justify-center">
          <Button
            variant="secondary"
            onClick={() => void loadMoreHistory()}
            isLoading={isLoadingMoreHistory}
            loadingLabel="正在加载..."
          >
            加载更多
          </Button>
        </div>
      ) : null}
    </section>
  );
}
