import type { RestoredHistoryRoomImage } from '@/lib/room-editor-history-state';

type GetRoomIdToDeleteForNewProjectInput = {
  roomImages: readonly RestoredHistoryRoomImage[];
  pendingRoomImage: RestoredHistoryRoomImage | null;
};

export function getRoomIdToDeleteForNewProject(input: GetRoomIdToDeleteForNewProjectInput) {
  if (input.pendingRoomImage) {
    return input.pendingRoomImage.id;
  }

  return input.roomImages.find((room) => !room.restoreHistoryItemId)?.id ?? null;
}
