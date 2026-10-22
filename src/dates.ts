/**
 * Pure calendar-date arithmetic on { y, m, d } integers.
 *
 * This is the ONLY module that touches the JS Date object, and it only uses
 * Date.UTC so there is no local time zone or DST involved anywhere.
 */

export interface Ymd {
  y: number;
  m: number; // 1..12
  d: number; // 1..31
}

const MS_PER_DAY = 86_400_000;

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInMonth(y: number, m: number): number {
  if (m === 2) return isLeapYear(y) ? 29 : 28;
  return [4, 6, 9, 11].includes(m) ? 30 : 31;
}

export function isValidYmd(d: Ymd): boolean {
  return (
    Number.isInteger(d.y) &&
    Number.isInteger(d.m) &&
    Number.isInteger(d.d) &&
    d.m >= 1 &&
    d.m <= 12 &&
    d.d >= 1 &&
    d.d <= daysInMonth(d.y, d.m)
  );
}

/** Strict `yyyy-mm-dd`. Returns null for anything else, including impossible dates. */
export function parseIso(s: string): Ymd | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const ymd = { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
  return isValidYmd(ymd) ? ymd : null;
}

export function toIso(d: Ymd): string {
  const pad = (n: number, w: number) => String(n).padStart(w, '0');
  return `${pad(d.y, 4)}-${pad(d.m, 2)}-${pad(d.d, 2)}`;
}

/** Days since 1970-01-01. Integer, so comparisons and differences are exact. */
export function toEpochDay(d: Ymd): number {
  return Date.UTC(d.y, d.m - 1, d.d) / MS_PER_DAY;
}

export function fromEpochDay(n: number): Ymd {
  const dt = new Date(n * MS_PER_DAY);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

export function compare(a: Ymd, b: Ymd): number {
  return toEpochDay(a) - toEpochDay(b);
}

export function addDays(d: Ymd, n: number): Ymd {
  return fromEpochDay(toEpochDay(d) + n);
}

/** Adds whole months; the day is clamped to the target month's length (31 Jan + 1 → 28/29 Feb). */
export function addMonths(d: Ymd, n: number): Ymd {
  const total = d.y * 12 + (d.m - 1) + n;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return { y, m, d: Math.min(d.d, daysInMonth(y, m)) };
}

export function addYears(d: Ymd, n: number): Ymd {
  return addMonths(d, n * 12);
}

export function endOfMonth(y: number, m: number): Ymd {
  return { y, m, d: daysInMonth(y, m) };
}

/** 0 = Sunday … 6 = Saturday, as in JS Date. Monday is 1. */
export function dayOfWeek(d: Ymd): number {
  return new Date(Date.UTC(d.y, d.m - 1, d.d)).getUTCDay();
}

export const MONDAY = 1;

/** The first date on or after `d` that falls on `weekday` (0 = Sunday … 6 = Saturday). */
export function nextWeekdayOnOrAfter(d: Ymd, weekday: number): Ymd {
  const delta = (weekday - dayOfWeek(d) + 7) % 7;
  return addDays(d, delta);
}

/** 1 Jul → 30 Jun = 365. Both ends count. */
export function daysBetweenInclusive(a: Ymd, b: Ymd): number {
  return toEpochDay(b) - toEpochDay(a) + 1;
}
