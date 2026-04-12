'use client';

import { AnimatePresence, motion } from 'motion/react';
import { History, Layers, Lightbulb, Loader2, Sofa, Sparkles, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { type RoomEditorController } from './use-room-editor-controller';
import { SwipeableRoomCard } from './SwipeableRoomCard';
import { COMMON_FURNITURE } from './room-editor-prompt';
import { MAX_SELECTED_FURNITURES } from '@/lib/room-editor-limits';
import { shouldBypassImageOptimization } from '@/lib/remote-images';

type RoomEditorInputPanelProps = {
  controller: RoomEditorController;
};

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
    roomStatusLabel,
    selectedFurnitures,
    setActiveRoomId,
    setCustomInstruction,
    setIsDrawerOpen,
    setIsNewProjectModalOpen,
    setLightboxImageUrl,
    toggleFurniture,
  } = controller;

  return (
    <div className="flex flex-col space-y-5 lg:space-y-6 lg:col-span-1 overflow-y-auto scrollbar-hide pb-2 relative rounded-2xl">
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-shadow duration-300">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-900 font-bold flex items-center justify-center text-sm">1</div>
            <h3 className="font-medium text-zinc-900">上传室内图</h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {activeRoom ? (
              <button
                type="button"
                onClick={() => setIsNewProjectModalOpen(true)}
                disabled={isUploadingRooms || isGenerating || isStartingNewProject}
                className="inline-flex items-center rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                新建项目
              </button>
            ) : pendingRoomImage ? (
              <button
                type="button"
                onClick={handleContinuePendingRoom}
                disabled={isUploadingRooms}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <History size={14} />
                继续上次室内图
              </button>
            ) : null}
            <span className="text-xs font-medium bg-zinc-100 text-zinc-600 px-2 py-1 rounded-md">
              {roomStatusLabel}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <AnimatePresence>
            {roomImages.map((room) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                key={room.id}
                className="group"
              >
                <SwipeableRoomCard
                  room={room}
                  isActive={activeRoom?.id === room.id}
                  isDeleting={deletingRoomIds.includes(room.id)}
                  onSelect={setActiveRoomId}
                  onDelete={removeRoom}
                  onPreview={setLightboxImageUrl}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          <div
            className={`relative aspect-video border-2 border-dashed rounded-xl transition-colors ${
              isUploadingRooms
                ? 'border-zinc-200 bg-zinc-50 text-zinc-400'
                : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:border-zinc-300'
            }`}
          >
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              {isUploadingRooms ? (
                <>
                  <Loader2 size={20} className="mb-1 text-indigo-500 animate-spin" />
                  <span className="text-xs font-medium text-indigo-500">上传中...</span>
                </>
              ) : (
                <>
                  <Upload size={20} className="mb-1 text-zinc-400" />
                  <span className="text-xs font-medium">{activeRoom ? '替换室内图' : '上传室内图'}</span>
                </>
              )}
            </div>
            <input
              type="file"
              onChange={handleRoomUpload}
              className={`absolute inset-0 h-full w-full opacity-0 ${isUploadingRooms ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              accept="image/*"
              disabled={isUploadingRooms}
              aria-label={activeRoom ? '替换室内图' : '上传室内图'}
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-900 font-bold flex items-center justify-center text-sm">2</div>
            <h3 className="font-medium text-zinc-900">选择家具</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium bg-zinc-100 text-zinc-600 px-2 py-1 rounded-md">
              最多 {MAX_SELECTED_FURNITURES} 张
            </span>
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Layers size={16} />
              打开图册
            </button>
          </div>
        </div>

        {selectedFurnitures.length === 0 ? (
          <div className="text-sm text-zinc-500 bg-zinc-50 p-6 rounded-xl border border-dashed border-zinc-200 text-center flex flex-col items-center gap-2">
            <Sofa size={24} className="text-zinc-300" />
            <p>尚未选择家具</p>
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="mt-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors"
            >
              从图册选择
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {selectedFurnitures.map((item) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  key={item.id}
                  className="relative w-20 h-20 rounded-lg border border-zinc-200 overflow-hidden group shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setLightboxImageUrl(item.imageUrl)}
                >
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-contain bg-zinc-50 p-1 transition-transform duration-500 group-hover:scale-110"
                    sizes="80px"
                    unoptimized={shouldBypassImageOptimization(item.imageUrl)}
                  />
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleFurniture(item);
                    }}
                    className="absolute top-1 right-1 bg-white/90 backdrop-blur-md text-red-500 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 hover:scale-110 shadow-sm z-10"
                  >
                    <X size={12} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              disabled={isUploadingFurniture}
              className={`w-20 h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-colors ${
                isUploadingFurniture
                  ? 'border-zinc-200 bg-zinc-50 text-zinc-400 cursor-not-allowed'
                  : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:border-zinc-300 cursor-pointer'
              }`}
            >
              {isUploadingFurniture ? (
                <>
                  <Loader2 size={16} className="mb-1 text-indigo-500 animate-spin" />
                  <span className="text-[10px] font-medium text-indigo-500">识别中...</span>
                </>
              ) : (
                <>
                  <Layers size={16} className="mb-1 text-zinc-400" />
                  <span className="text-[10px] font-medium">继续选择</span>
                </>
              )}
            </button>
          </div>
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

      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-shadow duration-300">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-900 font-bold flex items-center justify-center text-sm">3</div>
            <h3 className="font-medium text-zinc-900">附加指令 <span className="text-zinc-400 text-sm font-normal">(可选)</span></h3>
          </div>
          <button
            onClick={handleRecommendInstruction}
            className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors"
            title="随机填入一条实用指令"
          >
            <Lightbulb size={14} />
            推荐指令
          </button>
        </div>

        <div className="mb-3">
          <div className="text-xs text-zinc-500 mb-2">快捷选择要替换的家具：</div>
          <div className="flex flex-wrap gap-2">
            {COMMON_FURNITURE.map((item) => (
              <button
                key={item}
                onClick={() => handleAddFurnitureTag(item)}
                className="text-xs px-3 py-1.5 bg-zinc-50 border border-zinc-200 text-zinc-600 rounded-full hover:bg-zinc-100 hover:border-zinc-300 transition-colors"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {hasDuplicateFurnitureTypes && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm text-amber-800 leading-relaxed">
              友情提醒：当前选择中包含同类家具。建议您在下方附加指令里补充更细的描述，例如“双人沙发”“餐椅”“梳妆凳”，帮助 AI 更准确地区分它们，并把所有家具放进同一张空间效果图中。
            </p>
          </div>
        )}

        <textarea
          value={customInstruction}
          onChange={(event) => setCustomInstruction(event.target.value)}
          placeholder="例如：第1件家具是双人沙发，第2件家具是餐椅，第3件家具是落地灯。请把这些家具同时放进当前房间..."
          className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none transition-all resize-none h-24 text-sm"
        />
      </div>

      <div className="sticky bottom-0 pt-4 pb-2 bg-gradient-to-t from-zinc-50 via-zinc-50/90 to-transparent backdrop-blur-[2px] z-20 mt-auto -mx-1 px-1">
        <button
          onClick={() => handleGenerate()}
          disabled={!activeRoom || selectedFurnitures.length === 0 || isGenerating}
          className={`w-full py-4 rounded-2xl font-medium flex items-center justify-center gap-2 transition-all duration-300 active:scale-[0.98] group ${
            !activeRoom || selectedFurnitures.length === 0
              ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200'
              : isGenerating
                ? 'bg-indigo-500 text-white cursor-wait shadow-lg shadow-indigo-500/20'
                : 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-md hover:shadow-xl hover:-translate-y-0.5'
          }`}
        >
          {isGenerating ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              正在生成当前室内图...
            </>
          ) : (
            <>
              {selectedFurnitures.length > 1 ? <Layers size={20} className="group-hover:rotate-6 transition-transform" /> : <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />}
              <span className="group-hover:tracking-wider transition-all duration-300">
                {selectedFurnitures.length > 1
                  ? `将 ${selectedFurnitures.length} 件家具放入当前房间`
                  : '在当前房间中可视化'}
              </span>
            </>
          )}
        </button>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-3 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-200 shadow-sm"
            >
              <p>{error}</p>
              {errorDetails.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-red-500 hover:text-red-700">
                    查看详细错误 ({errorDetails.length})
                  </summary>
                  <ul className="mt-2 max-h-32 overflow-y-auto space-y-1 text-xs text-red-500">
                    {errorDetails.map((detail, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="shrink-0">#{index + 1}</span>
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
