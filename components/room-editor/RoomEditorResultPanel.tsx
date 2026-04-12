'use client';

import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, ChevronLeft, ChevronRight, CircleDashed, Download, Image as ImageIcon, Layers, Loader2, MessageSquareText, Sparkles, X } from 'lucide-react';
import Image from 'next/image';
import { shouldBypassImageOptimization } from '@/lib/remote-images';
import { type FurnitureItem } from '@/lib/dashboard-types';
import { type RoomEditorController } from './use-room-editor-controller';

type RoomEditorResultPanelProps = {
  catalog: FurnitureItem[];
  controller: RoomEditorController;
};

function downloadCurrentImage(imageUrl: string): void {
  const fileName = `furniture-visualization-${Date.now()}.png`;
  const separator = imageUrl.includes('?') ? '&' : '?';
  const downloadUrl = `${imageUrl}${separator}download=${encodeURIComponent(fileName)}`;
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export function RoomEditorResultPanel({ catalog, controller }: RoomEditorResultPanelProps) {
  const {
    currentGeneratedImage,
    currentHistoryItem,
    currentResultIndex,
    currentSessionResults,
    generationChecklist,
    handleEnhanceVibe,
    handleResultNext,
    handleResultPrev,
    isGenerating,
    placedFurnitures,
    setIsFeedbackModalOpen,
    setLightboxImageUrl,
    setPlacedFurnitures,
  } = controller;

  function handleCanvasDrop(event: React.DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    const dataStr = event.dataTransfer.getData('application/json');
    if (!dataStr) {
      return;
    }

    try {
      const data = JSON.parse(dataStr) as {
        type: 'NEW' | 'MOVE';
        furnitureId?: string;
        instanceId?: string;
        offsetX?: number;
        offsetY?: number;
      };
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (data.type === 'NEW') {
        const furniture = catalog.find((item) => item.id === data.furnitureId);
        if (!furniture) {
          return;
        }

        setPlacedFurnitures((previous) => [
          ...previous,
          {
            instanceId: Math.random().toString(36).substring(2, 9),
            furniture,
            x: x - 64,
            y: y - 64,
            scale: 1,
          },
        ]);
        return;
      }

      setPlacedFurnitures((previous) =>
        previous.map((item) =>
          item.instanceId === data.instanceId
            ? { ...item, x: x - (data.offsetX ?? 0), y: y - (data.offsetY ?? 0) }
            : item
        )
      );
    } catch (error) {
      console.error(error);
    }
  }

  function handlePlacedFurnitureDragStart(
    event: React.DragEvent<HTMLDivElement>,
    instanceId: string
  ): void {
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;

    event.dataTransfer.setData('application/json', JSON.stringify({
      type: 'MOVE',
      instanceId,
      offsetX,
      offsetY,
    }));

    setTimeout(() => {
      event.currentTarget.style.opacity = '0.5';
    }, 0);
  }

  function handlePlacedFurnitureDragEnd(event: React.DragEvent<HTMLDivElement>): void {
    event.currentTarget.style.opacity = '1';
  }

  function handlePlacedFurnitureRemove(instanceId: string): void {
    setPlacedFurnitures((previous) => previous.filter((item) => item.instanceId !== instanceId));
  }

  function handlePlacedFurnitureScaleChange(instanceId: string, delta: number): void {
    setPlacedFurnitures((previous) =>
      previous.map((item) =>
        item.instanceId === instanceId
          ? { ...item, scale: Math.min(3, Math.max(0.5, item.scale + delta)) }
          : item
      )
    );
  }

  return (
    <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 shadow-md overflow-hidden flex flex-col lg:h-full">
      <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
        <h3 className="font-medium text-zinc-900 flex items-center gap-2">
          <ImageIcon size={18} className="text-zinc-400" />
          生成结果
        </h3>
        {currentGeneratedImage && !isGenerating && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 bg-zinc-100 px-2 py-1 rounded-md hidden sm:inline-block">
              提示：您可以将左侧家具直接拖拽到此图片上进行手动摆放
            </span>
            <button
              onClick={() => downloadCurrentImage(currentGeneratedImage.imageUrl)}
              className="text-sm flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-medium bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Download size={16} />
              下载当前
            </button>
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md hidden sm:inline-block">30 天后过期</span>
          </div>
        )}
      </div>

      <div
        className={`relative flex min-h-[300px] flex-1 flex-col items-center justify-center p-4 sm:min-h-[400px] sm:p-6 ${
          currentGeneratedImage ? 'bg-zinc-50/30' : 'bg-gradient-to-br from-zinc-50 via-white to-indigo-50/60'
        }`}
      >
        <AnimatePresence>
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-6"
            >
              <div className="w-full max-w-md bg-white p-6 sm:p-8 rounded-3xl shadow-2xl border border-zinc-100 text-center">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <Loader2 size={32} className="text-indigo-600 animate-spin" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 mb-2">AI 正在生成室内效果图</h3>
                <p className="text-zinc-500 text-sm mb-8">
                  正在把已选家具融合进当前室内图，请稍候片刻。
                </p>

                <div className="w-full h-4 bg-zinc-100 rounded-full overflow-hidden mb-3 shadow-inner">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-500 ease-out rounded-full"
                    style={{ width: '75%' }}
                  />
                </div>
                <div className="flex justify-between text-xs text-zinc-500 font-medium">
                  <span>处理中</span>
                  <span>请耐心等待...</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {currentGeneratedImage ? (
          <div
            className="relative w-full h-full min-h-[300px] sm:min-h-[400px] rounded-xl overflow-hidden shadow-lg border border-zinc-200"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleCanvasDrop}
          >
            <Image
              src={currentGeneratedImage.imageUrl}
              alt="Generated visualization"
              fill
              className="object-contain bg-zinc-50 cursor-pointer"
              sizes="(max-width: 1024px) 100vw, 66vw"
              priority
              unoptimized={shouldBypassImageOptimization(currentGeneratedImage.imageUrl)}
              onClick={() => setLightboxImageUrl(currentGeneratedImage.imageUrl)}
            />

            {currentSessionResults.length > 1 && (
              <>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    handleResultPrev();
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-30 bg-white/90 backdrop-blur-md text-zinc-700 hover:text-zinc-900 p-2 rounded-full shadow-lg border border-zinc-200 transition-all hover:scale-110 hover:bg-white"
                  aria-label="上一张结果"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    handleResultNext();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-30 bg-white/90 backdrop-blur-md text-zinc-700 hover:text-zinc-900 p-2 rounded-full shadow-lg border border-zinc-200 transition-all hover:scale-110 hover:bg-white"
                  aria-label="下一张结果"
                >
                  <ChevronRight size={22} />
                </button>
                <div className="absolute top-3 left-3 z-30 bg-black/60 backdrop-blur-md text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-sm">
                  {currentResultIndex + 1} / {currentSessionResults.length}
                </div>
              </>
            )}

            <AnimatePresence>
              {placedFurnitures.map((item) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  key={item.instanceId}
                  draggable
                  onDragStartCapture={(event) => handlePlacedFurnitureDragStart(event, item.instanceId)}
                  onDragEndCapture={handlePlacedFurnitureDragEnd}
                  style={{
                    position: 'absolute',
                    left: item.x,
                    top: item.y,
                    width: 128 * item.scale,
                    height: 128 * item.scale,
                    cursor: 'move',
                    zIndex: 20,
                  }}
                  className="group"
                >
                  <Image src={item.furniture.imageUrl} alt={item.furniture.name} fill className="object-contain drop-shadow-2xl" unoptimized />
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      handlePlacedFurnitureRemove(item.instanceId);
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-30"
                  >
                    <X size={14} />
                  </button>

                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-30">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handlePlacedFurnitureScaleChange(item.instanceId, -0.2);
                      }}
                      className="bg-zinc-800 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-zinc-700"
                    >
                      -
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handlePlacedFurnitureScaleChange(item.instanceId, 0.2);
                      }}
                      className="bg-zinc-800 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-zinc-700"
                    >
                      +
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-4 z-30 flex items-center gap-2 w-max max-w-full">
              <button
                onClick={handleEnhanceVibe}
                disabled={isGenerating || !currentHistoryItem}
                className="bg-indigo-600/95 backdrop-blur-md text-white hover:bg-indigo-700 px-4 py-2 rounded-full shadow-lg border border-indigo-500/50 flex items-center gap-2 text-sm font-medium transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles size={16} className="group-hover:-rotate-12 transition-transform" />
                一键增加氛围感
              </button>
              <button
                onClick={() => setIsFeedbackModalOpen(true)}
                className="bg-white/90 backdrop-blur-md text-zinc-700 hover:text-indigo-600 px-4 py-2 rounded-full shadow-lg border border-zinc-200 flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <MessageSquareText size={16} />
                不满意？提供反馈
              </button>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-xl"
          >
            <div className="rounded-[28px] border border-zinc-200 bg-white/95 p-6 text-center shadow-[0_24px_60px_-32px_rgba(24,24,27,0.35)] backdrop-blur sm:p-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lg shadow-zinc-900/10">
                <Layers size={28} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-500">Ready To Generate</p>
              <h4 className="mt-3 text-2xl font-bold text-zinc-900">准备生成当前房间效果</h4>
              <p className="mt-3 text-sm leading-7 text-zinc-600 sm:text-base">
                把左侧关键素材准备好后，新的空间效果图会直接出现在这里，方便你继续预览、下载和反馈。
              </p>

              <div className="mt-6 grid gap-3 text-left">
                {generationChecklist.map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-2xl border px-4 py-4 ${
                      item.ready
                        ? 'border-emerald-200 bg-emerald-50/80'
                        : 'border-zinc-200 bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          item.ready ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-zinc-400'
                        }`}
                      >
                        {item.ready ? <CheckCircle2 size={18} /> : <CircleDashed size={18} />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-zinc-900">{item.label}</p>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              item.ready ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-zinc-500'
                            }`}
                          >
                            {item.ready ? '已就绪' : '待完成'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-zinc-600">{item.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
