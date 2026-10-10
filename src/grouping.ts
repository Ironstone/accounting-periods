import { toIso } from './dates';
import type { PeriodInYear } from './periods';
import type { FinancialYearGroup, Period } from './types';

function toPublicPeriod(p: PeriodInYear['period']): Period {
  return { start: toIso(p.start), end: toIso(p.end), number: p.number, days: p.days };
}

/**
 * Lazily groups an ordered (possibly infinite) stream of periods into financial years.
 *
 * This is ADJACENT grouping: a group is emitted as soon as the next period belongs to a
 * different year. A conventional groupBy would try to consume the whole stream first and
 * never return on an infinite input.
 */
export function* groupByFinancialYear(stream: Iterable<PeriodInYear>): Generator<FinancialYearGroup> {
  let current: FinancialYearGroup | undefined;

  for (const item of stream) {
    const key = toIso(item.fy.start);
    if (!current || current.start !== key) {
      if (current) yield current;
      current = {
        label: item.fy.label,
        start: key,
        end: toIso(item.fy.end),
        days: item.fy.days,
        periodsInYear: item.periodsInYear,
        periods: [],
      };
    }
    current.periods.push(toPublicPeriod(item.period));
  }

  // A finite source: flush whatever is left.
  if (current) yield current;
}
