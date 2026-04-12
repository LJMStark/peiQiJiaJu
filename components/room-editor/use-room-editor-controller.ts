'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { readJson, type HistoryMutationResponse, type HistoryResponse, type RoomMutationResponse, type RoomsResponse } from '@/lib/client/api';
import { getFileInputSelection } from '@/lib/client/file-input';
import { type FurnitureItem, type HistoryItem, type PlacedFurniture } from '@/lib/dashboard-types';
import { getGenerationAccessState } from '@/lib/generation-access';
import { findDuplicateFurnitureGroups } from '@/lib/room-visualization';
import { loadRoomEditorBootstrapState } from '@/lib/room-editor-bootstrap';
import {
  restoreHistoryRoomState,
  type RestoredHistoryRoomImage,
} from '@/lib/room-editor-history-state';
import { MAX_SELECTED_FURNITURES } from '@/lib/room-editor-limits';
import { getRoomIdToDeleteForNewProject } from '@/lib/room-editor-project-state';
import { removeRoomFromState } from '@/lib/room-editor-room-state';
import { createEmptyRoomEditorWorkspaceState } from '@/lib/room-editor-workspace-state';
import { getDisplayInstruction, RECOMMENDED_INSTRUCTIONS } from './room-editor-prompt';

type RoomEditorUser = {
  id: string;
  role?: string;
  vipExpiresAt?: Date | null;
};

type UseRoomEditorControllerArgs = {
  onUploadFiles: (files: File[]) => Promise<FurnitureItem[]>;
  user: RoomEditorUser;
};

type GenerationErrorMessages = {
  missingHistoryItem?: string;
  missingRoomImage?: string;
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

export function useRoomEditorController({
  onUploadFiles,
  user,
}: UseRoomEditorControllerArgs) {
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

  function createGenerationSession(): string {
    setIsGenerating(true);
    setError(null);
    setErrorDetails([]);
    setPlacedFurnitures([]);
    setCurrentGeneratedImage(null);

    const sessionId = `session_${Date.now()}`;
    setGenerationSessionId(sessionId);
    setCurrentResultIndex(0);
    return sessionId;
  }

  function applyGenerationResult(item: HistoryItem, sessionId: string): void {
    const itemWithSession = { ...item, sessionId };
    setCurrentGeneratedImage(itemWithSession.generatedImage);
    setHistory((previous) => [itemWithSession, ...previous]);
  }

  function handleGenerationError(
    error: unknown,
    messages: GenerationErrorMessages = {}
  ): void {
    if (isFetchTransportError(error)) {
      setError('生成请求在网络层被中断了，请稍后重试；如果持续出现，请联系管理员检查 HTTPS 或反向代理超时配置。');
      return;
    }

    const message = getErrorMessage(error);
    if (message.includes('免费用户生图额度已用完') || message.includes('FREE_LIMIT_REACHED')) {
      setLimitModalType('free_limit');
      return;
    }

    if (message.includes('会员套餐已到期') || message.includes('VIP_EXPIRED')) {
      setLimitModalType('vip_expired');
      return;
    }

    if (message.includes('History item not found')) {
      setError(messages.missingHistoryItem ?? '当前结果已失效，请重新生成后再试。');
      return;
    }

    if (message.includes('Room image not found')) {
      setError(messages.missingRoomImage ?? '当前室内图已失效，请先重新上传后再生成。');
      return;
    }

    setError(message || '出错了，请重新生成。');
  }

  async function handleFurnitureUpload(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const { input, files } = getFileInputSelection(event);
    if (files.length === 0) {
      return;
    }

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
      if (uploadedItems.length > 0) {
        setSelectedFurnitures((previous) => [...previous, ...uploadedItems]);
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : '上传家具图片失败，请稍后重试。');
      setErrorDetails([]);
    } finally {
      input.value = '';
      setIsUploadingFurniture(false);
    }
  }

  async function handleRoomUpload(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const { input, files } = getFileInputSelection(event);
    if (files.length === 0) {
      return;
    }

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

  async function removeRoom(id: string): Promise<void> {
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
  }

  function toggleFurniture(item: FurnitureItem): void {
    setSelectedFurnitures((previous) => {
      const isSelected = previous.some((furniture) => furniture.id === item.id);
      if (isSelected) {
        return previous.filter((furniture) => furniture.id !== item.id);
      }

      if (previous.length >= MAX_SELECTED_FURNITURES) {
        setError(`室内编辑器一次最多只能选择 ${MAX_SELECTED_FURNITURES} 张家具图，请先移除一张。`);
        setErrorDetails([]);
        return previous;
      }

      setError(null);
      setErrorDetails([]);
      return [...previous, item];
    });
  }

  async function handleGenerate(feedbackOverride?: string): Promise<void> {
    if (!activeRoom || selectedFurnitures.length === 0) {
      return;
    }

    const access = getGenerationAccessState({
      role: user.role,
      vipExpiresAt: user.vipExpiresAt,
      generationCount: 0,
    });
    if (access.vipExpired) {
      setLimitModalType('vip_expired');
      return;
    }

    const sessionId = createGenerationSession();
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
      applyGenerationResult(payload.item, sessionId);
    } catch (generationError) {
      console.error('室内图生成错误:', generationError);
      handleGenerationError(generationError, {
        missingRoomImage: '当前室内图已失效，请先重新上传后再生成。',
      });
    } finally {
      setIsGenerating(false);
    }
  }

  function loadHistoryItem(item: HistoryItem): void {
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
    setCustomInstruction(getDisplayInstruction(item.customInstruction));
    setPlacedFurnitures([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleRecommendInstruction(): void {
    const random = RECOMMENDED_INSTRUCTIONS[Math.floor(Math.random() * RECOMMENDED_INSTRUCTIONS.length)];
    setCustomInstruction(random);
  }

  function handleAddFurnitureTag(furniture: string): void {
    const textToAdd = `替换房间里的${furniture}`;
    if (!customInstruction.includes(textToAdd)) {
      setCustomInstruction((previous) => (previous ? `${previous} ${textToAdd}。` : `${textToAdd}。`));
    }
  }

  function handleFeedbackSubmit(): void {
    if (!feedbackText.trim()) {
      return;
    }

    const feedback = feedbackText;
    setIsFeedbackModalOpen(false);
    setFeedbackText('');
    void handleGenerate(feedback);
  }

  const currentHistoryItem = currentGeneratedImage
    ? history.find((item) => item.generatedImage.id === currentGeneratedImage.id) ?? null
    : null;

  async function handleEnhanceVibe(): Promise<void> {
    if (!currentHistoryItem) {
      setError('当前结果尚未同步完成，请稍后再试。');
      setErrorDetails([]);
      return;
    }

    const access = getGenerationAccessState({
      role: user.role,
      vipExpiresAt: user.vipExpiresAt,
      generationCount: 0,
    });
    if (access.vipExpired) {
      setLimitModalType('vip_expired');
      return;
    }

    const sessionId = createGenerationSession();

    try {
      const response = await fetch('/api/generate-vibe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          historyItemId: currentHistoryItem.id,
        }),
      });
      const payload = await readJson<HistoryMutationResponse>(response);
      applyGenerationResult(payload.item, sessionId);
    } catch (generationError) {
      console.error('氛围增强错误:', generationError);
      handleGenerationError(generationError, {
        missingHistoryItem: '当前结果已失效，请重新生成后再试。',
      });
    } finally {
      setIsGenerating(false);
    }
  }

  function handleContinuePendingRoom(): void {
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
  }

  function applyEmptyWorkspace(): void {
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
  }

  async function handleStartNewProject(): Promise<void> {
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
  }

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
      description: selectedFurnitures.length > 0
        ? `已选择 ${selectedFurnitures.length} 件家具，生成时会一起融合到当前房间。`
        : `从图册中选择 1-${MAX_SELECTED_FURNITURES} 件家具，告诉 AI 这次要放进去什么。`,
      ready: selectedFurnitures.length > 0,
    },
  ];

  function handleResultPrev(): void {
    if (currentSessionResults.length <= 1) {
      return;
    }

    const newIndex = (currentResultIndex - 1 + currentSessionResults.length) % currentSessionResults.length;
    setCurrentResultIndex(newIndex);
    setCurrentGeneratedImage(currentSessionResults[newIndex].generatedImage);
  }

  function handleResultNext(): void {
    if (currentSessionResults.length <= 1) {
      return;
    }

    const newIndex = (currentResultIndex + 1) % currentSessionResults.length;
    setCurrentResultIndex(newIndex);
    setCurrentGeneratedImage(currentSessionResults[newIndex].generatedImage);
  }

  return {
    furnitureUploadInputId,
    roomImages,
    pendingRoomImage,
    activeRoomId,
    selectedFurnitures,
    customInstruction,
    currentGeneratedImage,
    generationSessionId,
    currentResultIndex,
    isGenerating,
    error,
    history,
    previewFurniture,
    placedFurnitures,
    activeCategory,
    isUploadingFurniture,
    isUploadingRooms,
    deletingRoomIds,
    isBootstrapping,
    isDrawerOpen,
    isFeedbackModalOpen,
    feedbackText,
    lightboxImageUrl,
    errorDetails,
    historyDisplayCount,
    limitModalType,
    isNewProjectModalOpen,
    isStartingNewProject,
    activeRoom,
    hasDuplicateFurnitureTypes,
    roomStatusLabel,
    currentHistoryItem,
    currentSessionResults,
    generationChecklist,
    setActiveRoomId,
    setCustomInstruction,
    setPreviewFurniture,
    setPlacedFurnitures,
    setActiveCategory,
    setIsDrawerOpen,
    setIsFeedbackModalOpen,
    setFeedbackText,
    setLightboxImageUrl,
    setHistoryDisplayCount,
    setLimitModalType,
    setIsNewProjectModalOpen,
    handleFurnitureUpload,
    handleRoomUpload,
    removeRoom,
    toggleFurniture,
    handleGenerate,
    loadHistoryItem,
    handleRecommendInstruction,
    handleAddFurnitureTag,
    handleFeedbackSubmit,
    handleEnhanceVibe,
    handleContinuePendingRoom,
    handleStartNewProject,
    handleResultPrev,
    handleResultNext,
  };
}

export type RoomEditorController = ReturnType<typeof useRoomEditorController>;
export type { RoomEditorUser };
