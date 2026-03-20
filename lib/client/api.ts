import type { FurnitureItem, HistoryItem, RoomImage } from '@/lib/dashboard-types';

export async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? 'Request failed.');
  }

  return payload;
}

export async function postJson<TResponse>(url: string, body?: unknown): Promise<TResponse> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return readJson<TResponse>(response);
}

export type CatalogResponse = {
  items: FurnitureItem[];
  error?: string;
};

export type CatalogMutationResponse = {
  item: FurnitureItem;
  error?: string;
};

export type RoomsResponse = {
  items: RoomImage[];
  error?: string;
};

export type RoomMutationResponse = {
  item: RoomImage;
  error?: string;
};

export type HistoryResponse = {
  items: HistoryItem[];
  error?: string;
};

export type HistoryMutationResponse = {
  item: HistoryItem;
  error?: string;
};
