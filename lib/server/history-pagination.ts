export const DEFAULT_HISTORY_PAGE_SIZE = 12;
export const MAX_HISTORY_PAGE_SIZE = 48;

export type HistoryCursor = {
  createdAt: string;
  id: string;
};

type HistoryCursorPayload = Partial<HistoryCursor>;

function normalizeCreatedAt(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    throw new Error('INVALID_HISTORY_CURSOR');
  }

  return new Date(timestamp).toISOString();
}

export function encodeHistoryCursor(cursor: HistoryCursor): string {
  return Buffer.from(JSON.stringify({
    createdAt: normalizeCreatedAt(cursor.createdAt),
    id: cursor.id,
  })).toString('base64url');
}

export function decodeHistoryCursor(value: string | null | undefined): HistoryCursor | null {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(trimmedValue, 'base64url').toString('utf8')) as HistoryCursorPayload;
    const createdAt = typeof payload.createdAt === 'string' ? normalizeCreatedAt(payload.createdAt) : null;
    const id = typeof payload.id === 'string' ? payload.id.trim() : '';

    if (!createdAt || !id) {
      throw new Error('INVALID_HISTORY_CURSOR');
    }

    return { createdAt, id };
  } catch {
    throw new Error('INVALID_HISTORY_CURSOR');
  }
}

export function parseHistoryPageSize(value: string | null | undefined): number {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    return DEFAULT_HISTORY_PAGE_SIZE;
  }

  const pageSize = Number(trimmedValue);
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error('INVALID_HISTORY_LIMIT');
  }

  return Math.min(pageSize, MAX_HISTORY_PAGE_SIZE);
}
