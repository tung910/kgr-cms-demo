// Spec §15.5 flags that "effective date" comparisons (auto-attach-from vs.
// a sync timestamp) must use one consistent time zone, and proposes
// Asia/Ho_Chi_Minh business time pending backend-contract sign-off (see
// spec §16 for the note recording that this codebase now follows that
// proposal consistently). `Intl.DateTimeFormat('en-CA', { timeZone })`
// formats as `YYYY-MM-DD` directly — no date library dependency needed.
const businessDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// Derives the `YYYY-MM-DD` calendar date, in Asia/Ho_Chi_Minh business time,
// that a `Date` or ISO timestamp falls on. Used wherever an auto-attach
// effective date is compared against a device/sync timestamp, so both sides
// of the comparison agree on the same time zone regardless of the browser's
// or the mock server's local clock.
export function businessDateOf(date: Date | string): string {
  const value = typeof date === 'string' ? new Date(date) : date;
  return businessDateFormatter.format(value);
}
