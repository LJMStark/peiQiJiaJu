export function buildHistorySnapshotRoomId(input: {
  historyItemId: string;
  roomImageId: string | null | undefined;
}) {
  return `${input.historyItemId}:room`;
}

export function canUseHistoryRoomSnapshotForRequest(input: {
  historyItemId: string;
  storedRoomImageId: string | null | undefined;
  requestedRoomImageId: string;
}) {
  const snapshotRoomId = buildHistorySnapshotRoomId({
    historyItemId: input.historyItemId,
    roomImageId: input.storedRoomImageId,
  });

  if (input.requestedRoomImageId === snapshotRoomId) {
    return true;
  }

  return Boolean(input.storedRoomImageId) && input.requestedRoomImageId === input.storedRoomImageId;
}
