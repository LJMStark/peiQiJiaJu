import type { RoomImage } from '@/lib/dashboard-types';

export type RestoredHistoryRoomImage = RoomImage & {
  restoreHistoryItemId?: string;
};

type RestoreHistoryRoomStateInput = {
  currentRooms: readonly RestoredHistoryRoomImage[];
  historyItemId: string;
  historyRoom: RoomImage;
};

export function restoreHistoryRoomState({
  currentRooms,
  historyItemId,
  historyRoom,
}: RestoreHistoryRoomStateInput) {
  if (currentRooms.some((room) => room.id === historyRoom.id)) {
    return {
      rooms: [...currentRooms],
      activeRoomId: historyRoom.id,
    };
  }

  return {
    rooms: [
      {
        ...historyRoom,
        restoreHistoryItemId: historyItemId,
      },
      ...currentRooms,
    ],
    activeRoomId: historyRoom.id,
  };
}
