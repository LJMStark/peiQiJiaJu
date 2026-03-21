import { ROOM_ASPECT_RATIOS, type RoomAspectRatio } from './dashboard-types.ts';

export function getClosestRoomAspectRatio(ratio: number): RoomAspectRatio {
  if (!Number.isFinite(ratio) || ratio <= 0) {
    throw new Error('Room aspect ratio must be a positive finite number.');
  }

  let closest: (typeof ROOM_ASPECT_RATIOS)[number] = ROOM_ASPECT_RATIOS[0];
  let minDiff = Math.abs(ratio - closest.value);

  for (const candidate of ROOM_ASPECT_RATIOS.slice(1)) {
    const diff = Math.abs(ratio - candidate.value);
    if (diff < minDiff) {
      closest = candidate;
      minDiff = diff;
    }
  }

  return closest.name;
}

export function inferRoomAspectRatioFromDimensions(input: {
  width: number;
  height: number;
}): RoomAspectRatio {
  if (!Number.isFinite(input.width) || input.width <= 0 || !Number.isFinite(input.height) || input.height <= 0) {
    throw new Error('Room image dimensions must be positive numbers.');
  }

  return getClosestRoomAspectRatio(input.width / input.height);
}
