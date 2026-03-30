'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Upload, Sparkles, Image as ImageIcon, Loader2, Download, History, Clock, X, Layers, MessageSquareText, Lightbulb, Sofa, ChevronLeft, ChevronRight, CheckCircle2, CircleDashed } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { readJson, type RoomsResponse, type RoomMutationResponse, type HistoryResponse, type HistoryMutationResponse } from '@/lib/client/api';
import { formatBeijingTime } from '@/lib/beijing-time';
import { type FurnitureItem, type HistoryItem, type PlacedFurniture } from '@/lib/dashboard-types';
import { getGenerationAccessState } from '@/lib/generation-access';
import { MAX_SELECTED_FURNITURES } from '@/lib/room-editor-limits';
import { loadRoomEditorBootstrapState } from '@/lib/room-editor-bootstrap';
import { shouldBypassImageOptimization } from '@/lib/remote-images';
import { getFileInputSelection } from '@/lib/client/file-input';
import { findDuplicateFurnitureGroups } from '@/lib/room-visualization';
import {
  restoreHistoryRoomState,
  type RestoredHistoryRoomImage,
} from '@/lib/room-editor-history-state';
import { getRoomIdToDeleteForNewProject } from '@/lib/room-editor-project-state';
import { createEmptyRoomEditorWorkspaceState } from '@/lib/room-editor-workspace-state';
import { removeRoomFromState } from '@/lib/room-editor-room-state';
import { FurniturePreviewModal } from './room-editor/FurniturePreviewModal';
import { FurnitureDrawer } from './room-editor/FurnitureDrawer';
import { FeedbackModal } from './room-editor/FeedbackModal';
import { ImageLightbox } from './room-editor/ImageLightbox';
import { NewProjectConfirmModal } from './room-editor/NewProjectConfirmModal';
import { SwipeableRoomCard } from './room-editor/SwipeableRoomCard';
import { UsageLimitModal } from './UsageLimitModal';

const COMMON_FURNITURE = ['沙发', '床', '餐桌', '茶几', '椅子', '书桌', '衣柜', '电视柜'];
const RECOMMENDED_INSTRUCTIONS = [
  "请将新家具放在房间的中心位置，保持原有的光影效果。",
  "只提取参考图中的主体家具，忽略背景，替换掉房间里靠窗的旧家具。",
  "将新家具放置在空旷的地板上，并确保其大小比例与房间其他家具协调。",
  "保留房间原有的装饰品，仅替换主要的座位区域。",
  "请将家具放置在角落，调整好透视角度，使其看起来像是一个舒适的休息区。",
  "提取参考图中的家具，替换房间里的旧家具，并确保新家具的阴影方向与房间光源一致。"
];

type RoomEditorProps = {
  catalog: FurnitureItem[];
  onUploadFiles: (files: File[]) => Promise<FurnitureItem[]>;
  user: {
    id: string;
    role?: string;
    vipExpiresAt?: Date | null;
  };
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function isFetchTransportError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const normalizedMessage = error.message.trim().toLowerCase();
  return error.name === 'TypeError'
    && (
      normalizedMessage === 'failed to fetch'
      || normalizedMessage.includes('networkerror')
      || normalizedMessage.includes('network request failed')
      || normalizedMessage.includes('load failed')
    );
}

export function RoomEditor({ catalog, onUploadFiles, user }: RoomEditorProps) {
  const [roomImages, setRoomImages] = useState<RestoredHistoryRoomImage[]>([]);
  const [pendingRoomImage, setPendingRoomImage] = useState<RestoredHistoryRoomImage | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [selectedFurnitures, setSelectedFurnitures] = useState<FurnitureItem[]>([]);
  const [customInstruction, setCustomInstruction] = useState('');
  const [currentGeneratedImage, setCurrentGeneratedImage] = useState<HistoryItem['generatedImage'] | null>(null);
  const [generationSessionId, setGenerationSessionId] = useState<string | null>(null);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [previewFurniture, setPreviewFurniture] = useState<FurnitureItem | null>(null);
  const [placedFurnitures, setPlacedFurnitures] = useState<PlacedFurniture[]>([]);
  const [activeCategory, setActiveCategory] = useState('全部');
  const [isUploadingFurniture, setIsUploadingFurniture] = useState(false);
  const [isUploadingRooms, setIsUploadingRooms] = useState(false);
  const [deletingRoomIds, setDeletingRoomIds] = useState<string[]>([]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [historyDisplayCount, setHistoryDisplayCount] = useState(12);
  const [limitModalType, setLimitModalType] = useState<'free_limit' | 'vip_expired' | null>(null);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isStartingNewProject, setIsStartingNewProject] = useState(false);

  const furnitureUploadInputId = useId();
  const activeRoomIdRef = useRef<string | null>(activeRoomId);
  const deletingRoomIdsRef = useRef<Set<string>>(new Set());
  const activeRoom = activeRoomId ? roomImages.find((room) => room.id === activeRoomId) ?? null : null;
  const hasDuplicateFurnitureTypes = findDuplicateFurnitureGroups(selectedFurnitures).length > 0;
  const roomStatusLabel = isBootstrapping
    ? '同步中...'
    : activeRoom
      ? '已选定'
      : roomImages.length > 0
        ? `可选 ${roomImages.length} 张`
        : '未上传';

  useEffect(() => {
    activeRoomIdRef.current = activeRoomId;
  }, [activeRoomId]);

  useEffect(() => {
    const loadPersistedAssets = async () => {
      try {
        const nextState = await loadRoomEditorBootstrapState({
          loadRooms: async () => {
            const response = await fetch('/api/rooms', { cache: 'no-store' });
            const payload = await readJson<RoomsResponse>(response);
            return payload.items;
          },
          loadHistory: async () => {
            const response = await fetch('/api/history', { cache: 'no-store' });
            const payload = await readJson<HistoryResponse>(response);
            return payload.items;
          },
        });

        setRoomImages(nextState.roomImages);
        setPendingRoomImage(nextState.pendingRoomImage);
        setActiveRoomId(nextState.activeRoomId);
        setHistory(nextState.history);
        setError(nextState.error);
        setErrorDetails(nextState.errorDetails);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '加载编辑器资源失败，请刷新页面重试。');
        setErrorDetails([]);
      } finally {
        setIsBootstrapping(false);
      }
    };

    void loadPersistedAssets();
  }, []);

  useEffect(() => {
    if (roomImages.length === 0) {
      if (activeRoomId !== null) {
        setActiveRoomId(null);
      }
      return;
    }

    if (activeRoomId && !roomImages.some((room) => room.id === activeRoomId)) {
      setActiveRoomId(roomImages[0].id);
    }
  }, [activeRoomId, roomImages]);

  const handleFurnitureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { input, files } = getFileInputSelection(e);
    if (files.length > 0) {
      setError(null);
      setErrorDetails([]);
      setIsUploadingFurniture(true);
      try {
        const availableSlots = Math.max(0, MAX_SELECTED_FURNITURES - selectedFurnitures.length);
        if (availableSlots === 0) {
          setError(`当前最多只能选择 ${MAX_SELECTED_FURNITURES} 张家具图，请先移除一张再继续添加。`);
          return;
        }

        const filesToUpload = files.slice(0, availableSlots);
        if (files.length > availableSlots) {
          setError(`当前最多还能添加 ${availableSlots} 张家具图，已自动选取前 ${availableSlots} 张。`);
        }
        const uploadedItems = await onUploadFiles(filesToUpload);
        if (uploadedItems && uploadedItems.length > 0) {
          setSelectedFurnitures(prev => [...prev, ...uploadedItems]);
        }
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : '上传家具图片失败，请稍后重试。');
        setErrorDetails([]);
      } finally {
        input.value = '';
        setIsUploadingFurniture(false);
      }
    }
  };

  const handleRoomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { input, files } = getFileInputSelection(e);
    if (files.length > 0) {
      setError(null);
      setErrorDetails([]);
      setIsUploadingRooms(true);

      try {
        const [file] = files;
        if (!file || !file.type.startsWith('image/')) {
          return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', file.name.replace(/\.[^/.]+$/, ''));

        const response = await fetch('/api/rooms', {
          method: 'POST',
          body: formData,
        });
        const payload = await readJson<RoomMutationResponse>(response);

        setRoomImages([payload.item]);
        setPendingRoomImage(null);
        setActiveRoomId(payload.item.id);
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : '上传室内图失败，请稍后重试。');
        setErrorDetails([]);
      } finally {
        input.value = '';
        setIsUploadingRooms(false);
      }
    }
  };

  const removeRoom = async (id: string) => {
    if (deletingRoomIdsRef.current.has(id)) {
      return;
    }

    const syncRemovedRoom = () => {
      setRoomImages((currentRooms) => {
        const nextState = removeRoomFromState({
          currentRooms,
          currentActiveRoomId: activeRoomIdRef.current,
          removedRoomId: id,
        });
        setActiveRoomId(nextState.activeRoomId);
        return nextState.rooms;
      });
    };

    setError(null);
    setErrorDetails([]);
    deletingRoomIdsRef.current.add(id);
    setDeletingRoomIds((current) => (current.includes(id) ? current : [...current, id]));

    try {
      const response = await fetch(`/api/rooms/${id}`, {
        method: 'DELETE',
      });

      await readJson<{ success: true }>(response);
      syncRemovedRoom();
    } catch (removeError) {
      const message = getErrorMessage(removeError);
      if (message.includes('Room image not found')) {
        syncRemovedRoom();
        return;
      }

      setError(message || '删除室内图失败，请稍后重试。');
      setErrorDetails([]);
    } finally {
      deletingRoomIdsRef.current.delete(id);
      setDeletingRoomIds((current) => current.filter((roomId) => roomId !== id));
    }
  };

  const toggleFurniture = (item: FurnitureItem) => {
    setSelectedFurnitures((prev) => {
      const isSelected = prev.some((f) => f.id === item.id);
      if (isSelected) {
        return prev.filter((f) => f.id !== item.id);
      }

      if (prev.length >= MAX_SELECTED_FURNITURES) {
        setError(`室内编辑器一次最多只能选择 ${MAX_SELECTED_FURNITURES} 张家具图，请先移除一张。`);
        setErrorDetails([]);
        return prev;
      }

      setError(null);
      setErrorDetails([]);
      return [...prev, item];
    });
  };

  const handleGenerate = async (feedbackOverride?: string) => {
    if (!activeRoom || selectedFurnitures.length === 0) return;

    // Pre-check: VIP expired users should be blocked immediately on client side
    const access = getGenerationAccessState({
      role: user.role,
      vipExpiresAt: user.vipExpiresAt,
      generationCount: 0,
    });
    if (access.vipExpired) {
      setLimitModalType('vip_expired');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setErrorDetails([]);
    setPlacedFurnitures([]);
    setCurrentGeneratedImage(null);

    const sessionId = `session_${Date.now()}`;
    setGenerationSessionId(sessionId);
    setCurrentResultIndex(0);

    let effectiveInstruction = customInstruction;
    if (feedbackOverride) {
      const feedbackLine = `[修正反馈]: ${feedbackOverride}`;
      effectiveInstruction = customInstruction.trim() ? `${customInstruction}\n${feedbackLine}` : feedbackLine;
    }

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomImageId: activeRoom.id,
          historyItemId: activeRoom.restoreHistoryItemId ?? null,
          furnitureItemIds: selectedFurnitures.map((furniture) => furniture.id),
          customInstruction: effectiveInstruction.trim() ? effectiveInstruction : null,
        }),
      });
      const payload = await readJson<HistoryMutationResponse>(response);
      const itemWithSession = { ...payload.item, sessionId };

      setCurrentGeneratedImage(itemWithSession.generatedImage);
      setHistory((previous) => [itemWithSession, ...previous]);
    } catch (err: unknown) {
      console.error('室内图生成错误:', err);
      if (isFetchTransportError(err)) {
        setError('生成请求在网络层被中断了，请稍后重试；如果持续出现，请联系管理员检查 HTTPS 或反向代理超时配置。');
        return;
      }
      const msg = getErrorMessage(err);
      if (msg.includes('免费用户生图额度已用完') || msg.includes('FREE_LIMIT_REACHED')) {
        setLimitModalType('free_limit');
        return;
      }
      if (msg.includes('会员套餐已到期') || msg.includes('VIP_EXPIRED')) {
        setLimitModalType('vip_expired');
        return;
      }
      if (msg.includes("Requested entity was not found")) {
        setError("当前 AI 服务暂不可用，请联系管理员检查 Gemini API 配置。");
      } else if (msg.includes('Room image not found')) {
        setError('当前室内图已失效，请先重新上传后再生成。');
      } else if (msg.includes("429") || msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("quota")) {
        setError("AI 服务请求过于频繁，请稍后再试。");
      } else if (msg.includes("500") || msg.includes("503")) {
        setError("AI 服务暂时不可用，请稍后再试。");
      } else {
        setError(msg || "生成过程中发生错误。");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setRoomImages((currentRooms) => {
      const nextState = restoreHistoryRoomState({
        currentRooms,
        historyItemId: item.id,
        historyRoom: item.roomImage,
      });
      setActiveRoomId(nextState.activeRoomId);
      return nextState.rooms;
    });
    setSelectedFurnitures(item.furnitures.length > 0 ? item.furnitures : [item.furniture]);
    setCurrentGeneratedImage(item.generatedImage);
    setCustomInstruction(item.customInstruction || '');
    setPlacedFurnitures([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRecommendInstruction = () => {
    const random = RECOMMENDED_INSTRUCTIONS[Math.floor(Math.random() * RECOMMENDED_INSTRUCTIONS.length)];
    setCustomInstruction(random);
  };

  const handleAddFurnitureTag = (furniture: string) => {
    const textToAdd = `替换房间里的${furniture}`;
    if (!customInstruction.includes(textToAdd)) {
      setCustomInstruction(prev => prev ? `${prev} ${textToAdd}。` : `${textToAdd}。`);
    }
  };

  const handleFeedbackSubmit = () => {
    if (!feedbackText.trim()) return;
    const feedback = feedbackText;
    setIsFeedbackModalOpen(false);
    setFeedbackText('');
    void handleGenerate(feedback);
  };

  const handleEnhanceVibe = () => {
    void handleGenerate('增加必要的软装搭配和灯光，营造出极致的氛围感，不要改变里面原有的家具、柜体、吊顶等元素');
  };

  const handleContinuePendingRoom = () => {
    if (!pendingRoomImage) {
      return;
    }

    setRoomImages((currentRooms) => {
      if (currentRooms.some((room) => room.id === pendingRoomImage.id)) {
        return currentRooms;
      }

      return [pendingRoomImage, ...currentRooms];
    });
    setActiveRoomId(pendingRoomImage.id);
    setPendingRoomImage(null);
    setError(null);
    setErrorDetails([]);
  };

  const applyEmptyWorkspace = () => {
    const nextState = createEmptyRoomEditorWorkspaceState();
    setRoomImages(nextState.roomImages);
    setPendingRoomImage(nextState.pendingRoomImage);
    setActiveRoomId(nextState.activeRoomId);
    setSelectedFurnitures(nextState.selectedFurnitures);
    setCustomInstruction(nextState.customInstruction);
    setCurrentGeneratedImage(nextState.currentGeneratedImage);
    setPlacedFurnitures(nextState.placedFurnitures);
    setGenerationSessionId(nextState.generationSessionId);
    setCurrentResultIndex(nextState.currentResultIndex);
    setError(nextState.error);
    setErrorDetails(nextState.errorDetails);
    setFeedbackText('');
    setIsFeedbackModalOpen(false);
    setLightboxImageUrl(null);
    setLimitModalType(null);
  };

  const handleStartNewProject = async () => {
    if (!activeRoom || isStartingNewProject) {
      return;
    }

    const roomIdToDelete = getRoomIdToDeleteForNewProject({
      roomImages,
      pendingRoomImage,
    });

    setIsStartingNewProject(true);
    setError(null);
    setErrorDetails([]);

    try {
      if (roomIdToDelete) {
        const response = await fetch(`/api/rooms/${roomIdToDelete}`, {
          method: 'DELETE',
        });

        await readJson<{ success: true }>(response);
      }

      applyEmptyWorkspace();
      setIsNewProjectModalOpen(false);
    } catch (startError) {
      const message = getErrorMessage(startError);
      if (message.includes('Room image not found')) {
        applyEmptyWorkspace();
        setIsNewProjectModalOpen(false);
        return;
      }

      setError(message || '新建项目失败，请稍后重试。');
      setErrorDetails([]);
    } finally {
      setIsStartingNewProject(false);
    }
  };

  // Compute current session results for carousel navigation
  const currentSessionResults = generationSessionId
      ? history.filter((item) => (item as HistoryItem & { sessionId?: string }).sessionId === generationSessionId)
      : [];
  const generationChecklist = [
    {
      label: '当前室内图',
      description: activeRoom
        ? '已选定当前场景，可直接用于生成。'
        : pendingRoomImage
          ? '上传新的室内图，或继续上次室内图。'
          : '先上传 1 张室内图，确定这次要生成的空间。',
      ready: Boolean(activeRoom),
    },
    {
      label: '家具选择',
      description:
        selectedFurnitures.length > 0
          ? `已选择 ${selectedFurnitures.length} 件家具，生成时会一起融合到当前房间。`
          : `从图册中选择 1-${MAX_SELECTED_FURNITURES} 件家具，告诉 AI 这次要放进去什么。`,
      ready: selectedFurnitures.length > 0,
    },
  ];

  const handleResultPrev = () => {
    if (currentSessionResults.length <= 1) return;
    const newIndex = (currentResultIndex - 1 + currentSessionResults.length) % currentSessionResults.length;
    setCurrentResultIndex(newIndex);
    setCurrentGeneratedImage(currentSessionResults[newIndex].generatedImage);
  };

  const handleResultNext = () => {
    if (currentSessionResults.length <= 1) return;
    const newIndex = (currentResultIndex + 1) % currentSessionResults.length;
    setCurrentResultIndex(newIndex);
    setCurrentGeneratedImage(currentSessionResults[newIndex].generatedImage);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 mb-1">室内编辑器</h2>
        <p className="text-zinc-500">选择当前室内图，并将已选家具一次性融合到同一张效果图中。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-8 lg:h-[calc(100vh-180px)]">
        {/* Left Column: Inputs */}
        <div className="flex flex-col space-y-5 lg:space-y-6 lg:col-span-1 overflow-y-auto scrollbar-hide pb-2 relative rounded-2xl">
          {/* Step 1: Room Images */}
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
                {roomImages.map(room => (
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
                      onDelete={(id) => removeRoom(id)}
                      onPreview={(url) => setLightboxImageUrl(url)}
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
                {/* Keep the native file input as the actual tap target for mobile browser reliability. */}
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

          {/* Step 2: Select Furniture */}
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
                        onClick={(e) => { e.stopPropagation(); toggleFurniture(item); }}
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

          {/* Step 3: Custom Instructions */}
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
                {COMMON_FURNITURE.map(item => (
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
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder="例如：第1件家具是双人沙发，第2件家具是餐椅，第3件家具是落地灯。请把这些家具同时放进当前房间..."
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none transition-all resize-none h-24 text-sm"
            />
          </div>

          {/* Step 4: Generate (Sticky Bottom) */}
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
                        {errorDetails.map((detail, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="shrink-0">#{i + 1}</span>
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

        {/* Right Column: Result */}
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
                  onClick={() => {
                    const fileName = `furniture-visualization-${Date.now()}.png`;
                    const separator = currentGeneratedImage.imageUrl.includes('?') ? '&' : '?';
                    const downloadUrl = `${currentGeneratedImage.imageUrl}${separator}download=${encodeURIComponent(fileName)}`;
                    const a = document.createElement('a');
                    a.href = downloadUrl;
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
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
                      ></div>
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
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const dataStr = e.dataTransfer.getData('application/json');
                  if (!dataStr) return;
                  try {
                    const data = JSON.parse(dataStr);
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;

                    if (data.type === 'NEW') {
                      const furniture = catalog.find(f => f.id === data.furnitureId);
                      if (furniture) {
                        setPlacedFurnitures(prev => [...prev, {
                          instanceId: Math.random().toString(36).substring(2, 9),
                          furniture,
                          x: x - 64,
                          y: y - 64,
                          scale: 1
                        }]);
                      }
                    } else if (data.type === 'MOVE') {
                      setPlacedFurnitures(prev => prev.map(pf => 
                        pf.instanceId === data.instanceId 
                          ? { ...pf, x: x - data.offsetX, y: y - data.offsetY }
                          : pf
                      ));
                    }
                  } catch (err) {
                    console.error(err);
                  }
                }}
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

                {/* Carousel navigation arrows */}
                {currentSessionResults.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleResultPrev(); }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-30 bg-white/90 backdrop-blur-md text-zinc-700 hover:text-zinc-900 p-2 rounded-full shadow-lg border border-zinc-200 transition-all hover:scale-110 hover:bg-white"
                      aria-label="上一张结果"
                    >
                      <ChevronLeft size={22} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleResultNext(); }}
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
                  {placedFurnitures.map(pf => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      key={pf.instanceId}
                      draggable
                    onDragStart={(e) => {
                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      const eAsAny = e as any;
                      const clientX = eAsAny.clientX || (eAsAny.touches && eAsAny.touches[0].clientX);
                      const clientY = eAsAny.clientY || (eAsAny.touches && eAsAny.touches[0].clientY);
                      const offsetX = clientX - rect.left;
                      const offsetY = clientY - rect.top;
                      if (eAsAny.dataTransfer) {
                        eAsAny.dataTransfer.setData('application/json', JSON.stringify({ 
                          type: 'MOVE', 
                          instanceId: pf.instanceId,
                          offsetX,
                          offsetY
                        }));
                      }
                      setTimeout(() => {
                        (e.target as HTMLElement).style.opacity = '0.5';
                      }, 0);
                    }}
                    onDragEnd={(e) => {
                      (e.target as HTMLElement).style.opacity = '1';
                    }}
                    style={{
                      position: 'absolute',
                      left: pf.x,
                      top: pf.y,
                      width: 128 * pf.scale,
                      height: 128 * pf.scale,
                      cursor: 'move',
                      zIndex: 20
                    }}
                    className="group"
                  >
                    <Image src={pf.furniture.imageUrl} alt={pf.furniture.name} fill className="object-contain drop-shadow-2xl" unoptimized />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlacedFurnitures(prev => prev.filter(p => p.instanceId !== pf.instanceId));
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-30"
                    >
                      <X size={14} />
                    </button>
                    
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-30">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlacedFurnitures(prev => prev.map(p => p.instanceId === pf.instanceId ? { ...p, scale: Math.max(0.5, p.scale - 0.2) } : p));
                        }}
                        className="bg-zinc-800 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-zinc-700"
                      >
                        -
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlacedFurnitures(prev => prev.map(p => p.instanceId === pf.instanceId ? { ...p, scale: Math.min(3, p.scale + 0.2) } : p));
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
                    disabled={isGenerating}
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
      </div>

      {/* History Section */}
      {history.length > 0 && (
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

                      {item.customInstruction && (
                        <div className="flex items-start gap-3 mt-3 pt-3 border-t border-zinc-100">
                          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider w-12 mt-0.5">指令</div>
                          <div className="text-xs text-zinc-600 flex-1 line-clamp-2" title={item.customInstruction}>
                            {item.customInstruction}
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
                onClick={() => setHistoryDisplayCount(prev => prev + 12)}
                className="px-6 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-colors shadow-sm"
              >
                加载更多 ({Math.max(0, history.length - historyDisplayCount)} 条剩余)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Extracted Sub-Components */}
      {previewFurniture && (
        <FurniturePreviewModal
          furniture={previewFurniture}
          onClose={() => setPreviewFurniture(null)}
        />
      )}

      <FurnitureDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        catalog={catalog}
        selectedFurnitures={selectedFurnitures}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        onToggleFurniture={toggleFurniture}
        onPreview={setPreviewFurniture}
        uploadInputId={furnitureUploadInputId}
        isUploading={isUploadingFurniture}
        maxSelections={MAX_SELECTED_FURNITURES}
      />

      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        feedbackText={feedbackText}
        onFeedbackChange={setFeedbackText}
        onSubmit={handleFeedbackSubmit}
      />

      {lightboxImageUrl && (
        <ImageLightbox
          imageUrl={lightboxImageUrl}
          onClose={() => setLightboxImageUrl(null)}
        />
      )}

      <UsageLimitModal
        type={limitModalType ?? 'free_limit'}
        isOpen={limitModalType !== null}
        onClose={() => setLimitModalType(null)}
      />

      <NewProjectConfirmModal
        isOpen={isNewProjectModalOpen}
        isSubmitting={isStartingNewProject}
        onClose={() => setIsNewProjectModalOpen(false)}
        onConfirm={handleStartNewProject}
      />
    </div>
  );
}
