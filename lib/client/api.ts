import type { FurnitureItem, HistoryItem, RoomImage } from '@/lib/dashboard-types';

export async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? 'Request failed.');
  }

  return payload;
}

function buildJsonHeaders(headers?: HeadersInit): Headers {
  const jsonHeaders = new Headers(headers);
  jsonHeaders.set('Content-Type', 'application/json');
  return jsonHeaders;
}

export async function requestJson<TResponse>(url: string, init?: RequestInit): Promise<TResponse> {
  const response = await fetch(url, init);
  return readJson<TResponse>(response);
}

export async function postJson<TResponse>(
  url: string,
  body?: unknown,
  init?: Omit<RequestInit, 'body' | 'method'>
): Promise<TResponse> {
  return requestJson<TResponse>(url, {
    ...init,
    method: 'POST',
    headers: buildJsonHeaders(init?.headers),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
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
