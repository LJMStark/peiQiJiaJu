export type HistoryPageCursor = {
  createdAt: string;
  id: string;
};

export type HistoryPageOptions = {
  limit: number | undefined;
  cursor?: HistoryPageCursor | undefined;
};

export type ParsedHistoryPageOptions = HistoryPageOptions & {
  invalidCursor: boolean;
};

const HISTORY_PAGE_CURSOR_CREATED_AT_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3,6})Z$/;

function parseOptionalIntegerParam(value: string | null): number | undefined {
  if (value === null) {
    return undefined;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return undefined;
  }

  const parsedValue = Number(trimmedValue);
  if (!Number.isFinite(parsedValue)) {
    return undefined;
  }

  return Math.trunc(parsedValue);
}

function isValidHistoryPageCursorCreatedAt(value: string) {
  const match = HISTORY_PAGE_CURSOR_CREATED_AT_PATTERN.exec(value);
  if (!match) {
    return false;
  }

  const [
    ,
    yearText,
    monthText,
    dayText,
    hourText,
    minuteText,
    secondText,
    fractionalText,
  ] = match;

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const millisecond = Number(fractionalText.slice(0, 3));
  const parsedDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));

  return (
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day &&
    parsedDate.getUTCHours() === hour &&
    parsedDate.getUTCMinutes() === minute &&
    parsedDate.getUTCSeconds() === second &&
    parsedDate.getUTCMilliseconds() === millisecond
  );
}

function parseHistoryPageCursor(searchParams: URLSearchParams): HistoryPageCursor | undefined {
  const createdAt = searchParams.get('cursorCreatedAt')?.trim();
  const id = searchParams.get('cursorId')?.trim();

  if (!createdAt || !id) {
    return undefined;
  }

  if (!isValidHistoryPageCursorCreatedAt(createdAt)) {
    return undefined;
  }

  return {
    createdAt,
    id,
  };
}

function hasInvalidHistoryPageCursor(searchParams: URLSearchParams) {
  const createdAt = searchParams.get('cursorCreatedAt')?.trim();
  const id = searchParams.get('cursorId')?.trim();

  if (!createdAt || !id) {
    return false;
  }

  return !isValidHistoryPageCursorCreatedAt(createdAt);
}

export function parseHistoryPageOptions(searchParams: URLSearchParams): ParsedHistoryPageOptions {
  return {
    limit: parseOptionalIntegerParam(searchParams.get('limit')),
    cursor: parseHistoryPageCursor(searchParams),
    invalidCursor: hasInvalidHistoryPageCursor(searchParams),
  };
}

export function buildHistoryPageSearchParams(options: HistoryPageOptions): URLSearchParams {
  const searchParams = new URLSearchParams();

  if (options.limit !== undefined) {
    searchParams.set('limit', String(options.limit));
  }

  if (options.cursor) {
    searchParams.set('cursorCreatedAt', options.cursor.createdAt);
    searchParams.set('cursorId', options.cursor.id);
  }

  return searchParams;
}
