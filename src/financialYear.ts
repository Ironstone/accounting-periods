import { addDays, addYears, compare, daysBetweenInclusive, daysInMonth, type Ymd } from './dates';
import type { MonthDay } from './types';

export interface FinancialYear {
  start: Ymd;
  end: Ymd;
  days: number;
  label: string;
}

/** The FY start in a given calendar year, with the day clamped (e.g. 29 Feb in a non-leap year). */
function startIn(year: number, fyStart: MonthDay): Ymd {
  return { y: year, m: fyStart.month, d: Math.min(fyStart.day, daysInMonth(year, fyStart.month)) };
}

function build(start: Ymd): FinancialYear {
  const end = addDays(addYears(start, 1), -1);
  const label = start.y === end.y ? `${start.y}` : `${start.y}-${end.y}`;
  return { start, end, days: daysBetweenInclusive(start, end), label };
}

/** The financial year that contains `date` for a year starting on `fyStart` each calendar year. */
export function financialYearContaining(date: Ymd, fyStart: MonthDay): FinancialYear {
  const candidate = startIn(date.y, fyStart);
  const start = compare(date, candidate) < 0 ? startIn(date.y - 1, fyStart) : candidate;
  return build(start);
}

export function nextFinancialYear(fy: FinancialYear, fyStart: MonthDay): FinancialYear {
  return financialYearContaining(addDays(fy.end, 1), fyStart);
}
