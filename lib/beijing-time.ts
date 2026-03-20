const BEIJING_TIME_ZONE = 'Asia/Shanghai';

const beijingDateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BEIJING_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const beijingDateFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: BEIJING_TIME_ZONE,
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const beijingTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: BEIJING_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function toDate(value: string | number | Date) {
  return value instanceof Date ? value : new Date(value);
}

function getDateTimeParts(value: string | number | Date) {
  const date = toDate(value);
  const parts = beijingDateTimeFormatter.formatToParts(date);

  return {
    year: parts.find((part) => part.type === 'year')?.value ?? '',
    month: parts.find((part) => part.type === 'month')?.value ?? '',
    day: parts.find((part) => part.type === 'day')?.value ?? '',
    hour: parts.find((part) => part.type === 'hour')?.value ?? '',
    minute: parts.find((part) => part.type === 'minute')?.value ?? '',
  };
}

export function formatBeijingDateTime(value: string | number | Date) {
  const { year, month, day, hour, minute } = getDateTimeParts(value);
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

export function formatBeijingDate(value: string | number | Date) {
  return beijingDateFormatter.format(toDate(value));
}

export function formatBeijingTime(value: string | number | Date) {
  return beijingTimeFormatter.format(toDate(value));
}

export { BEIJING_TIME_ZONE };
