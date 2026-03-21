import type { RoomImage } from '@/lib/dashboard-types';

type ResolveHistoryRestoreRoomParams = {
  currentRooms: readonly RoomImage[];
  currentActiveRoomId: string | null;
  historyRoomId: string;
};

export function resolveHistoryRestoreRoomId({
  currentRooms,
  currentActiveRoomId,
  historyRoomId,
}: ResolveHistoryRestoreRoomParams) {
  if (currentRooms.some((room) => room.id === historyRoomId)) {
    return historyRoomId;
  }

  if (currentActiveRoomId && currentRooms.some((room) => room.id === currentActiveRoomId)) {
    return currentActiveRoomId;
  }

  return currentRooms[0]?.id ?? null;
}
