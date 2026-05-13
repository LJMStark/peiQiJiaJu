import type { FurnitureItem, HistoryItem, RoomImage } from '@/lib/dashboard-types';

function buildHttpErrorMessage(status: number): string {
  if (status === 504 || status === 408) {
    return '生成超时，请稍后重试。';
  }
  if (status === 502 || status === 503) {
    return '服务暂时不可用，请稍后重试。';
  }
  if (status === 401 || status === 403) {
    return '当前会话已失效，请刷新页面后重试。';
  }
  if (status === 429) {
    return '请求过于频繁，请稍后再试。';
  }
  if (status >= 500) {
    return '服务器开小差了，请稍后重试。';
  }
  return `请求失败 (HTTP ${status})。`;
}

export async function readJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.toLowerCase().includes('application/json');

  if (!isJson) {
    const fallbackMessage = response.ok
      ? '服务器返回了非预期的响应，请稍后重试。'
      : buildHttpErrorMessage(response.status);
    try {
      await response.text();
    } catch {
      // ignore body read errors; we only care about the message we throw next
    }
    throw new Error(fallbackMessage);
  }

  let payload: (T & { error?: string }) | null = null;
  try {
    payload = (await response.json()) as T & { error?: string };
  } catch {
    throw new Error(
      response.ok
        ? '服务器返回了非预期的响应，请稍后重试。'
        : buildHttpErrorMessage(response.status)
    );
  }

  if (!response.ok) {
    throw new Error(payload?.error ?? buildHttpErrorMessage(response.status));
  }

  return payload as T;
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
