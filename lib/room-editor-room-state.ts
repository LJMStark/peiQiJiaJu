import type { RoomImage } from '@/lib/dashboard-types';

export function removeRoomFromState(input: {
  currentRooms: readonly RoomImage[];
  currentActiveRoomId: string | null;
  removedRoomId: string;
}) {
  const nextRooms = input.currentRooms.filter((room) => room.id !== input.removedRoomId);
  const activeRoomStillExists = input.currentActiveRoomId
    ? nextRooms.some((room) => room.id === input.currentActiveRoomId)
    : false;

  return {
    rooms: nextRooms,
    activeRoomId: activeRoomStillExists ? input.currentActiveRoomId : (nextRooms[0]?.id ?? null),
  };
}
