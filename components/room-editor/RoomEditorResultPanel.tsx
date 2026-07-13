'use client';

import { CheckCircle2, CircleDashed, Download, Image as ImageIcon, MessageSquareText, Minus, MoreHorizontal, Plus, Sparkles, X } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { buildAssetDownloadPath } from '@/lib/asset-download';
import type { FurnitureItem } from '@/lib/dashboard-types';
import { shouldBypassImageOptimization } from '@/lib/remote-images';
import type { RoomEditorController } from './use-room-editor-controller';

type RoomEditorResultPanelProps = {
  catalog: FurnitureItem[];
  controller: RoomEditorController;
};

function triggerDownload(downloadUrl: string): void {
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export function RoomEditorResultPanel({ catalog, controller }: RoomEditorResultPanelProps) {
  const {
    activeRoom,
    currentGeneratedImage,
    currentHistoryItem,
    currentResultIndex,
    currentSessionResults,
    generationChecklist,
    handleEnhanceVibe,
    handleGenerate,
    isGenerating,
    placedFurnitures,
    selectSessionResult,
    setIsFeedbackModalOpen,
    setLightboxImageUrl,
    setPlacedFurnitures,
  } = controller;

  function handleCanvasDrop(event: React.DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    const dataString = event.dataTransfer.getData('application/json');
    if (!dataString) {
      return;
    }

    try {
      const data = JSON.parse(dataString) as { type: 'NEW'; furnitureId?: string };
      if (data.type !== 'NEW') {
        return;
      }
      const furniture = catalog.find((item) => item.id === data.furnitureId);
      if (!furniture) {
        return;
      }
      const rect = event.currentTarget.getBoundingClientRect();
      setPlacedFurnitures((previous) => [
        ...previous,
        {
          instanceId: Math.random().toString(36).slice(2, 9),
          furniture,
          x: event.clientX - rect.left - 64,
          y: event.clientY - rect.top - 64,
          scale: 1,
        },
      ]);
    } catch (error) {
      console.error('读取家具摆放信息失败:', error);
    }
  }

  function removePlacedFurniture(instanceId: string): void {
    setPlacedFurnitures((previous) => previous.filter((item) => item.instanceId !== instanceId));
  }

  function resizePlacedFurniture(instanceId: string, delta: number): void {
    setPlacedFurnitures((previous) => previous.map((item) => (
      item.instanceId === instanceId
        ? { ...item, scale: Math.min(3, Math.max(0.5, item.scale + delta)) }
        : item
    )));
  }

  const resultAspectRatio = activeRoom?.aspectRatio?.replace(':', ' / ') ?? '4 / 3';

  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-zinc-200 px-4 sm:px-5">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-zinc-900">
            <ImageIcon aria-hidden="true" size={18} className="text-zinc-500" />
            生成结果
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500">结果会自动保存到下方历史</p>
        </div>
        {currentGeneratedImage ? <span className="text-xs text-amber-700">保留 30 天</span> : null}
      </div>

      <div aria-live="polite" className="sr-only">
        {isGenerating ? '正在生成效果图' : currentGeneratedImage ? '效果图已生成，可以查看或下载' : '尚未生成效果图'}
      </div>

      <div className="relative flex min-h-[360px] flex-1 items-center justify-center bg-zinc-50 p-3 sm:min-h-[480px] sm:p-5">
        {isGenerating ? (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/90 px-6 text-center">
            <span className="mb-5 h-12 w-12 animate-spin rounded-full border-4 border-zinc-200 border-t-indigo-600" aria-hidden="true" />
            <h4 className="text-lg font-semibold text-zinc-900">正在生成室内效果图</h4>
            <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-600">正在把已选家具放进当前房间。完成时间会受图片大小和服务繁忙程度影响。</p>
          </div>
        ) : null}

        {currentGeneratedImage ? (
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-xl border border-zinc-200 bg-white"
            style={{ aspectRatio: resultAspectRatio }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleCanvasDrop}
          >
            <button
              type="button"
              onClick={() => setLightboxImageUrl(currentGeneratedImage.imageUrl)}
              aria-label="放大查看生成结果"
              className="relative h-full w-full"
            >
              <Image
                src={currentGeneratedImage.imageUrl}
                alt="生成后的室内效果图"
                fill
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 70vw"
                priority
                unoptimized={shouldBypassImageOptimization(currentGeneratedImage.imageUrl)}
              />
            </button>

            {placedFurnitures.map((item) => (
              <div
                key={item.instanceId}
                style={{ left: item.x, top: item.y, width: 128 * item.scale, height: 128 * item.scale }}
                className="group absolute z-20 hidden md:block"
              >
                <Image src={item.furniture.imageUrl} alt={item.furniture.name} fill className="object-contain drop-shadow-xl" unoptimized />
                <div className="absolute -right-2 -top-2 flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                  <button type="button" onClick={() => resizePlacedFurniture(item.instanceId, -0.2)} aria-label={`缩小${item.furniture.name}`} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-zinc-800 shadow"><Minus aria-hidden="true" size={14} /></button>
                  <button type="button" onClick={() => resizePlacedFurniture(item.instanceId, 0.2)} aria-label={`放大${item.furniture.name}`} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-zinc-800 shadow"><Plus aria-hidden="true" size={14} /></button>
                  <button type="button" onClick={() => removePlacedFurniture(item.instanceId)} aria-label={`移除${item.furniture.name}`} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-red-600 shadow"><X aria-hidden="true" size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full max-w-xl px-3 py-8">
            <h4 className="text-center text-xl font-semibold text-zinc-900">准备好素材后，结果会显示在这里</h4>
            <p className="mx-auto mt-2 max-w-md text-center text-sm leading-6 text-zinc-600">先完成左侧的室内图和家具选择。生成后可以直接下载，也可以继续调整要求再次生成。</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {generationChecklist.map((item) => (
                <div key={item.label} className="flex gap-3 rounded-xl border border-zinc-200 bg-white p-4">
                  {item.ready ? <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : <CircleDashed aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />}
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{item.label} · {item.ready ? '已就绪' : '待完成'}</p>
                    <p className="mt-1 text-xs leading-5 text-zinc-600">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {currentSessionResults.length > 1 ? (
        <div className="flex items-center gap-3 overflow-x-auto border-t border-zinc-200 px-4 py-3" aria-label="本次生成结果">
          <span className="shrink-0 text-xs font-medium text-zinc-500">{currentResultIndex + 1} / {currentSessionResults.length}</span>
          {currentSessionResults.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selectSessionResult(index)}
              aria-label={`查看第 ${index + 1} 张结果`}
              aria-current={index === currentResultIndex ? 'true' : undefined}
              className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-zinc-50 ${index === currentResultIndex ? 'border-indigo-600' : 'border-zinc-200'}`}
            >
              <Image src={item.generatedImage.imageUrl} alt="" fill className="object-cover" sizes="80px" unoptimized={shouldBypassImageOptimization(item.generatedImage.imageUrl)} />
            </button>
          ))}
        </div>
      ) : null}

      {currentGeneratedImage && !isGenerating ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 p-4 sm:p-5">
          <Button onClick={() => triggerDownload(buildAssetDownloadPath('generated', currentGeneratedImage))}>
            <Download aria-hidden="true" size={17} />
            下载结果
          </Button>
          <Button variant="secondary" onClick={() => handleGenerate()}>
            <Sparkles aria-hidden="true" size={17} />
            再次生成
          </Button>
          <details className="relative ml-auto">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-3 text-sm font-medium text-zinc-600 hover:bg-zinc-100">
              <MoreHorizontal aria-hidden="true" size={18} />
              更多操作
            </summary>
            <div className="absolute bottom-full right-0 z-30 mb-2 w-52 rounded-xl border border-zinc-200 bg-white p-2 shadow-xl">
              <button type="button" onClick={handleEnhanceVibe} disabled={!currentHistoryItem} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"><Sparkles aria-hidden="true" size={16} />增加氛围感</button>
              <button type="button" onClick={() => setIsFeedbackModalOpen(true)} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-zinc-700 hover:bg-zinc-100"><MessageSquareText aria-hidden="true" size={16} />反馈并修正</button>
            </div>
          </details>
        </div>
      ) : null}
    </section>
  );
}
