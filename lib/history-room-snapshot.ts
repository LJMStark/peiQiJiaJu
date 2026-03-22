export function buildHistorySnapshotRoomId(input: {
  historyItemId: string;
  roomImageId: string | null | undefined;
}) {
  return input.roomImageId ?? `${input.historyItemId}:room`;
}
