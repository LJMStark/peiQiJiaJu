export const DEFAULT_DUOMI_API_BASE = 'https://duomiapi.com';
export const DEFAULT_DUOMI_IMAGE_MODEL = 'gemini-3.1-flash-image-preview';

const DEFAULT_POLL_INTERVAL_MS = 2_000;
const DEFAULT_TIMEOUT_MS = 5 * 60_000;
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

type DuomiTaskState = 'pending' | 'running' | 'succeeded' | 'error';

type DuomiImageClientOptions = {
  apiKey: string;
  apiBase?: string;
  model?: string;
  fetchImpl?: typeof fetch;
  sleep?: (durationMs: number) => Promise<void>;
  now?: () => number;
  pollIntervalMs?: number;
  timeoutMs?: number;
  requestTimeoutMs?: number;
};

type CreateImageEditTaskInput = {
  prompt: string;
  imageUrls: readonly string[];
  aspectRatio?: string | null;
  imageSize?: string | null;
};

type DuomiTaskStatus = {
  state: DuomiTaskState;
  imageUrl?: string;
  error?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function getErrorDetail(payload: unknown) {
  if (!isRecord(payload)) {
    return '';
  }

  const directMessage = readString(payload.message)
    ?? readString(payload.msg)
    ?? readString(payload.error);
  if (directMessage) {
    return directMessage;
  }

  if (isRecord(payload.error)) {
    return readString(payload.error.message) ?? JSON.stringify(payload.error);
  }

  return JSON.stringify(payload);
}

async function readResponsePayload(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function parseTaskId(payload: unknown) {
  if (!isRecord(payload)) {
    return undefined;
  }

  const nestedData = isRecord(payload.data) ? payload.data : null;
  return readString(nestedData?.task_id) ?? readString(payload.task_id);
}

function parseTaskStatus(payload: unknown): DuomiTaskStatus {
  if (!isRecord(payload)) {
    throw new Error('Duomi API 返回的任务状态格式无效。');
  }

  const envelope = readString(payload.state)
    ? payload
    : isRecord(payload.data)
      ? payload.data
      : payload;
  const state = readString(envelope.state);
  if (
    state !== 'pending'
    && state !== 'running'
    && state !== 'succeeded'
    && state !== 'error'
  ) {
    throw new Error(`Duomi API 返回未知任务状态: ${state ?? 'missing'}`);
  }

  const resultData = isRecord(envelope.data) ? envelope.data : null;
  const images = Array.isArray(resultData?.images) ? resultData.images : [];
  const firstImage = isRecord(images[0]) ? images[0] : null;

  return {
    state,
    imageUrl: readString(firstImage?.url),
    error: readString(envelope.msg) ?? readString(envelope.error),
  };
}

function defaultSleep(durationMs: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, durationMs));
}

export function assertTrustedDuomiImageUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Duomi 返回了无效的图片地址。');
  }

  const isDuomiHost = url.hostname === 'dmiapi.com'
    || url.hostname.endsWith('.dmiapi.com');
  if (url.protocol !== 'https:' || !isDuomiHost) {
    throw new Error('Duomi 返回了不受信任的图片地址。');
  }

  return url.toString();
}

export function createDuomiImageClient(options: DuomiImageClientOptions) {
  const apiKey = options.apiKey.trim();
  if (!apiKey) {
    throw new Error('DUOMI_API 环境变量未设置。');
  }

  const apiBase = (options.apiBase ?? DEFAULT_DUOMI_API_BASE).replace(/\/$/, '');
  const model = options.model ?? DEFAULT_DUOMI_IMAGE_MODEL;
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? Date.now;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;

  async function requestJson(url: string, init: RequestInit) {
    const response = await fetchImpl(url, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(requestTimeoutMs),
    });
    const payload = await readResponsePayload(response);

    if (!response.ok) {
      const detail = getErrorDetail(payload);
      throw new Error(
        `Duomi API 错误: ${response.status}${detail ? ` - ${detail}` : ''}`
      );
    }

    if (isRecord(payload) && typeof payload.code === 'number' && payload.code !== 200) {
      const detail = getErrorDetail(payload);
      throw new Error(
        `Duomi API 错误: ${payload.code}${detail ? ` - ${detail}` : ''}`
      );
    }

    return payload;
  }

  async function createImageEditTask(input: CreateImageEditTaskInput) {
    if (input.imageUrls.length === 0) {
      throw new Error('Duomi 图片编辑至少需要一张参考图。');
    }

    const body: Record<string, unknown> = {
      model,
      prompt: input.prompt,
      image_urls: [...input.imageUrls],
    };

    if (input.aspectRatio) {
      body.aspect_ratio = input.aspectRatio;
    }
    if (input.imageSize) {
      body.image_size = input.imageSize;
    }

    const payload = await requestJson(`${apiBase}/api/gemini/nano-banana-edit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify(body),
    });
    const taskId = parseTaskId(payload);
    if (!taskId) {
      throw new Error('Duomi API 返回缺少任务 ID。');
    }

    return taskId;
  }

  async function getTaskStatus(taskId: string) {
    const payload = await requestJson(
      `${apiBase}/api/gemini/nano-banana/${encodeURIComponent(taskId)}`,
      {
        method: 'GET',
        headers: { Authorization: apiKey },
      }
    );

    return parseTaskStatus(payload);
  }

  async function waitForImage(taskId: string) {
    const startedAt = now();

    while (now() - startedAt < timeoutMs) {
      const status = await getTaskStatus(taskId);
      if (status.state === 'succeeded') {
        if (!status.imageUrl) {
          throw new Error('Duomi 任务成功但没有返回图片。');
        }
        return assertTrustedDuomiImageUrl(status.imageUrl);
      }

      if (status.state === 'error') {
        throw new Error(`Duomi 生图失败${status.error ? `: ${status.error}` : '。'}`);
      }

      await sleep(pollIntervalMs);
    }

    throw new Error(`Duomi 生图等待超时（${Math.round(timeoutMs / 1000)} 秒）。`);
  }

  return {
    createImageEditTask,
    getTaskStatus,
    waitForImage,
  };
}
