export type RoomImageCleanupCandidate = {
  id: string;
  storagePath: string;
  historyReferenceCount: number;
};

export function createRoomImageCleanupPlan(
  rooms: readonly RoomImageCleanupCandidate[],
  keepRoomIds: readonly string[]
) {
  const keepRoomIdSet = new Set(keepRoomIds);
  const staleRooms = rooms.filter((room) => !keepRoomIdSet.has(room.id));

  return {
    staleRoomIds: staleRooms.map((room) => room.id),
    staleStoragePathsToDelete: staleRooms
      .filter((room) => room.historyReferenceCount === 0)
      .map((room) => room.storagePath),
  };
}
