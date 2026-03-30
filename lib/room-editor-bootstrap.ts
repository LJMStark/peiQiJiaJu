import type { HistoryItem, RoomImage } from '@/lib/dashboard-types';
import type { HistoryPageCursor } from '@/lib/history-page';

type LoadHistoryResult = {
  items: HistoryItem[];
  hasMore: boolean;
  nextCursor: HistoryPageCursor | null;
};

type LoadRoomEditorBootstrapStateInput = {
  loadRooms: () => Promise<RoomImage[]>;
  loadHistory: () => Promise<LoadHistoryResult>;
};

export type RoomEditorBootstrapState = {
  roomImages: RoomImage[];
  pendingRoomImage: RoomImage | null;
  activeRoomId: string | null;
  history: HistoryItem[];
  historyNextCursor: HistoryPageCursor | null;
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

function getRoomCreatedAtValue(room: RoomImage): number {
  if (!room.createdAt) {
    return Number.NEGATIVE_INFINITY;
  }

  const timestamp = Date.parse(room.createdAt);
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

function getLatestRoomImage(roomImages: readonly RoomImage[]): RoomImage | null {
  let latestRoom: RoomImage | null = null;
  let latestTimestamp = Number.NEGATIVE_INFINITY;

  for (const room of roomImages) {
    const timestamp = getRoomCreatedAtValue(room);
    if (latestRoom === null || timestamp > latestTimestamp) {
      latestRoom = room;
      latestTimestamp = timestamp;
    }
  }

  return latestRoom;
}

export async function loadRoomEditorBootstrapState({
  loadRooms,
  loadHistory,
}: LoadRoomEditorBootstrapStateInput): Promise<RoomEditorBootstrapState> {
  const [roomsResult, historyResult] = await Promise.allSettled([loadRooms(), loadHistory()]);
  const roomImages = roomsResult.status === 'fulfilled' ? roomsResult.value : [];
  const pendingRoomImage = getLatestRoomImage(roomImages);
  const historyPage = historyResult.status === 'fulfilled'
    ? historyResult.value
    : { items: [], hasMore: false, nextCursor: null };
  const history = historyPage.items;
  const historyNextCursor = historyPage.nextCursor;

  if (roomsResult.status === 'rejected') {
    return {
      roomImages: [],
      pendingRoomImage: null,
      activeRoomId: null,
      history,
      historyNextCursor,
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
      roomImages: [],
      pendingRoomImage,
      activeRoomId: null,
      history: [],
      historyNextCursor: null,
      error: '历史记录暂时加载失败，你仍可继续编辑当前房间。',
      errorDetails: [getReasonMessage(historyResult.reason, '加载历史记录失败。')],
    };
  }

  return {
    roomImages: [],
    pendingRoomImage,
    activeRoomId: null,
    history,
    historyNextCursor,
    error: null,
    errorDetails: [],
  };
}
