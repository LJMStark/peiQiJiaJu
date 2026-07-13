'use client';

import { useState } from 'react';
import { ChevronDown, History, Layers, Lightbulb, Loader2, Sparkles, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { StatusNotice } from '@/components/ui/StatusNotice';
import { MAX_SELECTED_FURNITURES } from '@/lib/room-editor-limits';
import { shouldBypassImageOptimization } from '@/lib/remote-images';
import { COMMON_FURNITURE } from './room-editor-prompt';
import { SwipeableRoomCard } from './SwipeableRoomCard';
import type { RoomEditorController } from './use-room-editor-controller';

type RoomEditorInputPanelProps = {
  controller: RoomEditorController;
};

type StepNumber = 1 | 2 | 3;

function StepHeader({
  number,
  title,
  summary,
  isOpen,
  onToggle,
}: {
  number: StepNumber;
  title: string;
  summary: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-controls={`editor-step-${number}`}
      className="flex min-h-14 w-full items-center gap-3 text-left md:pointer-events-none"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white">
        {number}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-zinc-900">{title}</span>
        <span className="block truncate text-xs text-zinc-500 md:hidden">{summary}</span>
      </span>
      <ChevronDown
        aria-hidden="true"
        className={`h-5 w-5 shrink-0 text-zinc-400 transition-transform md:hidden ${isOpen ? 'rotate-180' : ''}`}
      />
    </button>
  );
}

export function RoomEditorInputPanel({ controller }: RoomEditorInputPanelProps) {
  const {
    activeRoom,
    customInstruction,
    deletingRoomIds,
    error,
    errorDetails,
    furnitureUploadInputId,
    handleAddFurnitureTag,
    handleContinuePendingRoom,
    handleFurnitureUpload,
    handleGenerate,
    handleRecommendInstruction,
    handleRoomUpload,
    hasDuplicateFurnitureTypes,
    isGenerating,
    isStartingNewProject,
    isUploadingFurniture,
    isUploadingRooms,
    pendingRoomImage,
    removeRoom,
    roomImages,
    selectedFurnitures,
    setActiveRoomId,
    setCustomInstruction,
    setIsDrawerOpen,
    setIsNewProjectModalOpen,
    setLightboxImageUrl,
    toggleFurniture,
  } = controller;
  const [openStep, setOpenStep] = useState<StepNumber>(1);

  const missingRequirements = [
    !activeRoom ? '还需上传室内图' : null,
    selectedFurnitures.length === 0 ? '还需选择家具' : null,
  ].filter((item): item is string => Boolean(item));
  const canGenerate = missingRequirements.length === 0 && !isGenerating;

  return (
    <aside className="self-start overflow-hidden rounded-2xl border border-zinc-200 bg-white lg:sticky lg:top-24">
      <div className="divide-y divide-zinc-200 md:grid md:grid-cols-2 md:divide-x md:divide-y-0 lg:block lg:divide-x-0 lg:divide-y">
        <section className="px-4 sm:px-5">
          <StepHeader
            number={1}
            title="选择室内图"
            summary={activeRoom ? '室内图已选择' : '等待上传室内图'}
            isOpen={openStep === 1}
            onToggle={() => setOpenStep(1)}
          />
          <div id="editor-step-1" className={`${openStep === 1 ? 'block' : 'hidden'} pb-5 md:block`}>
            <div className="mb-3 flex min-h-11 items-center justify-between gap-3">
              <span className="text-xs font-medium text-zinc-500">
                {activeRoom ? '当前室内图已就绪' : roomImages.length > 0 ? `可选 ${roomImages.length} 张` : '支持常见图片格式'}
              </span>
              {activeRoom ? (
                <Button
                  variant="ghost"
                  size="compact"
                  onClick={() => setIsNewProjectModalOpen(true)}
                  disabled={isUploadingRooms || isGenerating || isStartingNewProject}
                >
                  新建项目
                </Button>
              ) : pendingRoomImage ? (
                <Button variant="ghost" size="compact" onClick={handleContinuePendingRoom} disabled={isUploadingRooms}>
                  <History aria-hidden="true" size={14} />
                  继续上次室内图
                </Button>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {roomImages.map((room) => (
                <SwipeableRoomCard
                  key={room.id}
                  room={room}
                  isActive={activeRoom?.id === room.id}
                  isDeleting={deletingRoomIds.includes(room.id)}
                  onSelect={setActiveRoomId}
                  onDelete={removeRoom}
                  onPreview={setLightboxImageUrl}
                />
              ))}
              <label
                className={`relative flex aspect-video min-h-20 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed text-xs font-medium transition-colors ${
                  isUploadingRooms
                    ? 'cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-400'
                    : 'border-zinc-300 text-zinc-600 hover:border-indigo-300 hover:bg-indigo-50/40'
                }`}
              >
                {isUploadingRooms ? <Loader2 aria-hidden="true" className="mb-2 h-5 w-5 animate-spin text-indigo-600" /> : <Upload aria-hidden="true" className="mb-2 h-5 w-5" />}
                {isUploadingRooms ? '上传中...' : activeRoom ? '替换室内图' : '上传室内图'}
                <input
                  type="file"
                  onChange={handleRoomUpload}
                  className="sr-only"
                  accept="image/*"
                  disabled={isUploadingRooms}
                />
              </label>
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-5">
          <StepHeader
            number={2}
            title="选择家具"
            summary={selectedFurnitures.length > 0 ? `已选 ${selectedFurnitures.length} 件家具` : '尚未选择家具'}
            isOpen={openStep === 2}
            onToggle={() => setOpenStep(2)}
          />
          <div id="editor-step-2" className={`${openStep === 2 ? 'block' : 'hidden'} pb-5 md:block`}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-xs text-zinc-500">最多选择 {MAX_SELECTED_FURNITURES} 件</span>
              <Button variant="secondary" size="compact" onClick={() => setIsDrawerOpen(true)}>
                <Layers aria-hidden="true" size={16} />
                打开图册
              </Button>
            </div>
            {selectedFurnitures.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedFurnitures.map((item) => (
                  <div key={item.id} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
                    <button
                      type="button"
                      onClick={() => setLightboxImageUrl(item.imageUrl)}
                      aria-label={`查看${item.name}`}
                      className="relative h-full w-full"
                    >
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-contain p-1"
                        sizes="80px"
                        unoptimized={shouldBypassImageOptimization(item.imageUrl)}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFurniture(item)}
                      aria-label={`移除${item.name}`}
                      className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-red-600 shadow-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                    >
                      <X aria-hidden="true" size={14} />
                    </button>
                  </div>
                ))}
                <Button variant="ghost" size="icon" onClick={() => setIsDrawerOpen(true)} ariaLabel="继续选择家具" className="h-20 w-20 border-dashed">
                  <Layers aria-hidden="true" size={18} />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="flex min-h-24 w-full items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-sm font-medium text-zinc-700 hover:border-indigo-300 hover:bg-indigo-50/40"
              >
                从图册选择家具
              </button>
            )}
            <input
              id={furnitureUploadInputId}
              type="file"
              onChange={handleFurnitureUpload}
              className="sr-only"
              accept="image/*"
              multiple
              disabled={isUploadingFurniture}
            />
          </div>
        </section>

        <section className="px-4 sm:px-5 md:col-span-2 md:border-t md:border-zinc-200 lg:col-span-1 lg:border-t-0">
          <StepHeader
            number={3}
            title="补充要求"
            summary={customInstruction.trim() ? '已填写补充要求' : '可选'}
            isOpen={openStep === 3}
            onToggle={() => setOpenStep(3)}
          />
          <div id="editor-step-3" className={`${openStep === 3 ? 'block' : 'hidden'} pb-5 md:block`}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-zinc-500">可选，不填也能生成</span>
              <Button variant="ghost" size="compact" onClick={handleRecommendInstruction}>
                <Lightbulb aria-hidden="true" size={14} />
                推荐一句
              </Button>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {COMMON_FURNITURE.map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => handleAddFurnitureTag(item)}
                  className="min-h-9 rounded-full border border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-700 hover:bg-zinc-100"
                >
                  {item}
                </button>
              ))}
            </div>
            {hasDuplicateFurnitureTypes ? (
              <StatusNotice tone="warning" className="mb-3">
                选中了同类家具，请在补充要求里说明每件家具的用途或位置。
              </StatusNotice>
            ) : null}
            <label className="sr-only" htmlFor="editor-instruction">补充要求</label>
            <textarea
              id="editor-instruction"
              value={customInstruction}
              onChange={(event) => setCustomInstruction(event.target.value)}
              placeholder="例如：把双人沙发放在窗边，保留原有墙面和地板。"
              className="h-24 w-full resize-none rounded-xl border border-zinc-200 px-3 py-3 text-sm text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </section>
      </div>

      <div className="sticky bottom-0 border-t border-zinc-200 bg-white p-4 sm:p-5">
        {missingRequirements.length > 0 ? (
          <p className="mb-3 text-sm text-zinc-600">{missingRequirements.join('，')}</p>
        ) : null}
        <Button
          onClick={() => handleGenerate()}
          disabled={!canGenerate}
          isLoading={isGenerating}
          loadingLabel="正在生成效果图..."
          className="w-full"
        >
          <Sparkles aria-hidden="true" size={18} />
          {selectedFurnitures.length > 1 ? `生成含 ${selectedFurnitures.length} 件家具的效果图` : '生成效果图'}
        </Button>
        {error ? (
          <StatusNotice tone="error" className="mt-3" title="这次没有完成">
            <p>{error}</p>
            {errorDetails.length > 0 ? (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer">查看详细信息</summary>
                <ul className="mt-2 space-y-1">
                  {errorDetails.map((detail, index) => <li key={`${index}-${detail}`}>{detail}</li>)}
                </ul>
              </details>
            ) : null}
          </StatusNotice>
        ) : null}
      </div>
    </aside>
  );
}
