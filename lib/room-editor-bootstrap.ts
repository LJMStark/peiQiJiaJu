import type { HistoryItem, RoomImage } from '@/lib/dashboard-types';

type LoadRoomEditorBootstrapStateInput = {
  loadRooms: () => Promise<RoomImage[]>;
  loadHistory: () => Promise<HistoryItem[]>;
};

export type RoomEditorBootstrapState = {
  roomImages: RoomImage[];
  activeRoomId: string | null;
  history: HistoryItem[];
  error: string | null;
  errorDetails: string[];
};

function getReasonMessage(reason: unknown, fallback: string): string {
  if (reason instanceof Error) {
    return reason.message;
  }

  if (typeof reason === 'string' && reason.trim()) {
    return reason;
  }

  return fallback;
}

export async function loadRoomEditorBootstrapState({
  loadRooms,
  loadHistory,
}: LoadRoomEditorBootstrapStateInput): Promise<RoomEditorBootstrapState> {
  const [roomsResult, historyResult] = await Promise.allSettled([loadRooms(), loadHistory()]);
  const roomImages = roomsResult.status === 'fulfilled' ? roomsResult.value : [];
  const history = historyResult.status === 'fulfilled' ? historyResult.value : [];

  if (roomsResult.status === 'rejected') {
    return {
      roomImages: [],
      activeRoomId: null,
      history,
      error: '加载编辑器资源失败，请刷新页面重试。',
      errorDetails: [
        getReasonMessage(roomsResult.reason, '加载室内图失败。'),
        ...(historyResult.status === 'rejected'
          ? [getReasonMessage(historyResult.reason, '加载历史记录失败。')]
          : []),
      ],
    };
  }

  if (historyResult.status === 'rejected') {
    return {
      roomImages,
      activeRoomId: roomImages[0]?.id ?? null,
      history: [],
      error: '历史记录暂时加载失败，你仍可继续编辑当前房间。',
      errorDetails: [getReasonMessage(historyResult.reason, '加载历史记录失败。')],
    };
  }

  return {
    roomImages,
    activeRoomId: roomImages[0]?.id ?? null,
    history,
    error: null,
    errorDetails: [],
  };
}
