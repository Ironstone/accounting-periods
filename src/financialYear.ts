import { MONDAY, addDays, compare, daysBetweenInclusive, daysInMonth, nextWeekdayOnOrAfter, type Ymd } from './dates';
import type { MonthDay, YearStartRule } from './types';

export interface FinancialYear {
  start: Ymd;
  end: Ymd;
  days: number;
  /** Named after the NOMINAL year(s), e.g. "2020-2021" even if the Monday rule starts it on 6 July. */
  label: string;
}

/** The nominal FY start in a given calendar year, with the day clamped (e.g. 29 Feb in a non-leap year). */
function nominalStartIn(year: number, fyStart: MonthDay): Ymd {
  return { y: year, m: fyStart.month, d: Math.min(fyStart.day, daysInMonth(year, fyStart.month)) };
}

/** The actual first day of the FY whose nominal start is in `year`, after applying the rule. */
function actualStartIn(year: number, fyStart: MonthDay, rule: YearStartRule): Ymd {
  const nominal = nominalStartIn(year, fyStart);
  return rule === 'firstMondayOnOrAfter' ? nextWeekdayOnOrAfter(nominal, MONDAY) : nominal;
}

function build(year: number, fyStart: MonthDay, rule: YearStartRule): FinancialYear {
  const start = actualStartIn(year, fyStart, rule);
  const end = addDays(actualStartIn(year + 1, fyStart, rule), -1);
  const nominalEnd = addDays(nominalStartIn(year + 1, fyStart), -1);
  const label = year === nominalEnd.y ? `${year}` : `${year}-${nominalEnd.y}`;
  return { start, end, days: daysBetweenInclusive(start, end), label };
}

/** The financial year that contains `date` for a year nominally starting on `fyStart` each calendar year. */
export function financialYearContaining(date: Ymd, fyStart: MonthDay, rule: YearStartRule = 'exactDate'): FinancialYear {
  // The actual start can only move later than the nominal one (by up to 6 days), so a date can
  // fall before this year's actual start while being after the nominal one. Check both.
  for (const year of [date.y, date.y - 1]) {
    const fy = build(year, fyStart, rule);
    if (compare(date, fy.start) >= 0 && compare(date, fy.end) <= 0) return fy;
  }
  return build(date.y + 1, fyStart, rule); // only reachable for dates in the last days of December with a 1 Jan Monday rule
}

export function nextFinancialYear(fy: FinancialYear, fyStart: MonthDay, rule: YearStartRule = 'exactDate'): FinancialYear {
  return financialYearContaining(addDays(fy.end, 1), fyStart, rule);
}
