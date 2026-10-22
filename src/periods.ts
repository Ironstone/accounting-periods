import { addDays, addMonths, compare, daysBetweenInclusive, type Ymd } from './dates';
import { financialYearContaining, nextFinancialYear, type FinancialYear } from './financialYear';
import type { PeriodLength, ResolvedConfig } from './types';

/** A period with raw Ymd dates. Converted to IsoDate strings at the grouping boundary. */
export interface PeriodSpan {
  start: Ymd;
  end: Ymd;
  number: number;
  days: number;
}

/** One item of the infinite stream: a period plus the year it belongs to. */
export interface PeriodInYear {
  period: PeriodSpan;
  fy: FinancialYear;
  periodsInYear: number;
}

/**
 * How a period length advances from the FY start.
 * - days:    a constant step; can leave 1–2 leftover days at a fixed-date year end (remainderPolicy).
 * - months:  a constant step; 12 months is exactly one year, so never a remainder.
 * - pattern: a fixed list of period lengths in WEEKS (4-4-5 etc.). The period count is the
 *            pattern length; any leftover (the 53rd week) always extends the last period.
 */
type Scheme = { kind: 'days'; n: number } | { kind: 'months'; n: number } | { kind: 'pattern'; weeks: readonly number[] };

const Q445 = [4, 4, 5] as const;
const Q454 = [4, 5, 4] as const;
const Q544 = [5, 4, 4] as const;
const fourQuarters = (q: readonly number[]) => [...q, ...q, ...q, ...q];

const SCHEMES: Record<PeriodLength, Scheme> = {
  week: { kind: 'days', n: 7 },
  fortnight: { kind: 'days', n: 14 },
  month: { kind: 'months', n: 1 },
  quarter: { kind: 'months', n: 3 },
  '4-4-5': { kind: 'pattern', weeks: fourQuarters(Q445) },
  '4-5-4': { kind: 'pattern', weeks: fourQuarters(Q454) },
  '5-4-4': { kind: 'pattern', weeks: fourQuarters(Q544) },
  '13x4': { kind: 'pattern', weeks: Array(13).fill(4) },
};

/** Start of the i-th period (0-based), anchored to the FY start so months never drift. */
function advance(fyStart: Ymd, i: number, scheme: Scheme): Ymd {
  switch (scheme.kind) {
    case 'days': return addDays(fyStart, i * scheme.n);
    case 'months': return addMonths(fyStart, i * scheme.n);
    case 'pattern': {
      const weeksBefore = scheme.weeks.slice(0, i).reduce((a, b) => a + b, 0);
      return addDays(fyStart, weeksBefore * 7);
    }
  }
}

export type PeriodRule = Pick<ResolvedConfig, 'periodLength' | 'remainderPolicy'>;

/** Every period in one financial year, numbered 1..N. */
export function periodsInYear(fy: FinancialYear, rule: PeriodRule): PeriodSpan[] {
  const scheme = SCHEMES[rule.periodLength];
  const maxPeriods = scheme.kind === 'pattern' ? scheme.weeks.length : Number.POSITIVE_INFINITY;

  const starts: Ymd[] = [];
  for (let i = 0; i < maxPeriods; i++) {
    const s = advance(fy.start, i, scheme);
    if (compare(s, fy.end) > 0) break;
    starts.push(s);
  }

  const spans: PeriodSpan[] = starts.map((start, k) => {
    const next = starts[k + 1];
    const end = next ? addDays(next, -1) : fy.end; // the last period always runs to the year end
    return { start, end, number: k + 1, days: daysBetweenInclusive(start, end) };
  });

  if (scheme.kind === 'days' && rule.remainderPolicy === 'extendLastPeriod') {
    const last = spans[spans.length - 1];
    const prev = spans[spans.length - 2];
    if (last && prev && last.days < scheme.n) {
      spans.pop();
      prev.end = fy.end;
      prev.days = daysBetweenInclusive(prev.start, prev.end);
    }
  }

  return spans;
}

export type GeneratorConfig = Pick<ResolvedConfig, 'financialYearStart' | 'periodLength' | 'remainderPolicy'> &
  Partial<Pick<ResolvedConfig, 'firstYearScope' | 'yearStartRule'>>;

/**
 * Infinite, lazy stream of periods.
 * - firstYearScope 'fromStartDate' (default): begins with the period that CONTAINS `startDate`.
 *   Snapping (2020-07-02 → period starting 2020-07-01) falls out of "contains".
 * - firstYearScope 'wholeYear': begins at period 1 of the year containing `startDate`.
 * Every later year is always complete.
 */
export function* periods(startDate: Ymd, config: GeneratorConfig): Generator<PeriodInYear> {
  const wholeFirstYear = (config.firstYearScope ?? 'fromStartDate') === 'wholeYear';
  const rule = config.yearStartRule ?? 'exactDate';
  let fy = financialYearContaining(startDate, config.financialYearStart, rule);
  let isFirstYear = true;
  for (;;) {
    const spans = periodsInYear(fy, config);
    for (const period of spans) {
      if (!isFirstYear || wholeFirstYear || compare(period.end, startDate) >= 0) {
        yield { period, fy, periodsInYear: spans.length };
      }
    }
    isFirstYear = false;
    fy = nextFinancialYear(fy, config.financialYearStart, rule);
  }
}
