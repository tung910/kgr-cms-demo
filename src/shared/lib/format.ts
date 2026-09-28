const vietnameseLocale = 'vi-VN';

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat(vietnameseLocale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(
  value: string | Date | null | undefined
): string {
  return formatDateTimeInLocale(value, vietnameseLocale);
}

export function formatDateTimeInLocale(
  value: string | Date | null | undefined,
  locale = vietnameseLocale
): string {
  if (!value) return '—';

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

const relativeUnits: ReadonlyArray<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 525_600],
  ['month', 43_200],
  ['day', 1_440],
  ['hour', 60],
  ['minute', 1],
];

// "5 phút trước" / "3 hours ago". Returns null under one minute (or for a
// future timestamp) so the caller shows its own "just now" label.
export function formatRelativeTime(
  value: string,
  locale = vietnameseLocale,
  now = Date.now()
): string | null {
  const minutes = Math.floor((now - new Date(value).getTime()) / 60_000);
  if (!(minutes >= 1)) return null;
  const [unit, size] = relativeUnits.find(([, size]) => minutes >= size) ?? [
    'minute',
    1,
  ];
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
    -Math.floor(minutes / size),
    unit
  );
}
