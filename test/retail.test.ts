import { calculate } from '../src/calculate';
import { dayOfWeek, nextWeekdayOnOrAfter, parseIso, toIso, type Ymd } from '../src/dates';
import { financialYearContaining } from '../src/financialYear';
import { take } from '../src/iter';
import { periods, periodsInYear, type GeneratorConfig } from '../src/periods';

const d = (s: string): Ymd => parseIso(s)!;
const JULY = { month: 7, day: 1 };

describe('week helpers', () => {
  it('W1 dayOfWeek: 1 Jul 2020 was a Wednesday, 1 Jul 2024 a Monday', () => {
    expect(dayOfWeek(d('2020-07-01'))).toBe(3);
    expect(dayOfWeek(d('2024-07-01'))).toBe(1);
  });

  it('W2 nextWeekdayOnOrAfter: on a Monday returns the same day, otherwise the next Monday', () => {
    expect(toIso(nextWeekdayOnOrAfter(d('2020-07-01'), 1))).toBe('2020-07-06');
    expect(toIso(nextWeekdayOnOrAfter(d('2024-07-01'), 1))).toBe('2024-07-01');
    expect(toIso(nextWeekdayOnOrAfter(d('2020-07-05'), 1))).toBe('2020-07-06'); // Sunday → next day
  });
});

describe('financial year with firstMondayOnOrAfter', () => {
  it('F12 nominal 1 Jul 2020 starts Monday 6 Jul 2020, 52 weeks, label stays 2020-2021', () => {
    const fy = financialYearContaining(d('2020-07-06'), JULY, 'firstMondayOnOrAfter');
    expect(toIso(fy.start)).toBe('2020-07-06');
    expect(toIso(fy.end)).toBe('2021-07-04');
    expect(fy.days).toBe(364);
    expect(fy.label).toBe('2020-2021');
  });

  it('F13 nominal 1 Jul 2024 is already a Monday; the year has 53 weeks', () => {
    const fy = financialYearContaining(d('2024-07-01'), JULY, 'firstMondayOnOrAfter');
    expect(toIso(fy.start)).toBe('2024-07-01');
    expect(toIso(fy.end)).toBe('2025-07-06');
    expect(fy.days).toBe(371);
  });

  it('F14 a date between the nominal and actual start belongs to the PREVIOUS year', () => {
    const fy = financialYearContaining(d('2020-07-02'), JULY, 'firstMondayOnOrAfter');
    expect(fy.label).toBe('2019-2020');
    expect(toIso(fy.end)).toBe('2020-07-05');
  });

  it('F15 calendar year with the Monday rule keeps a single-year label', () => {
    const fy = financialYearContaining(d('2021-02-01'), { month: 1, day: 1 }, 'firstMondayOnOrAfter');
    expect(toIso(fy.start)).toBe('2021-01-04');
    expect(fy.label).toBe('2021');
  });

  it('F16 consecutive years are contiguous and every start is a Monday', () => {
    const cfg: GeneratorConfig = { financialYearStart: JULY, periodLength: '4-4-5', remainderPolicy: 'shortLastPeriod', yearStartRule: 'firstMondayOnOrAfter' };
    const items = take(periods(d('2020-07-06'), cfg), 12 * 10);
    const years = [...new Set(items.map((i) => toIso(i.fy.start)))];
    expect(years).toHaveLength(10);
    for (const y of years) expect(dayOfWeek(d(y))).toBe(1);
    for (let i = 1; i < items.length; i++) {
      expect(toIso(items[i]!.period.start)).toBe(toIso(addOne(items[i - 1]!.period.end)));
    }
  });
});

describe('retail patterns', () => {
  const fy2020 = financialYearContaining(d('2020-07-06'), JULY, 'firstMondayOnOrAfter'); // 364 days
  const fy2024 = financialYearContaining(d('2024-07-01'), JULY, 'firstMondayOnOrAfter'); // 371 days
  const rule = (periodLength: GeneratorConfig['periodLength']) => ({ periodLength, remainderPolicy: 'shortLastPeriod' as const });

  it('R1 4-4-5 in a 52-week year: 12 periods of 28/28/35 days on quarter boundaries', () => {
    const p = periodsInYear(fy2020, rule('4-4-5'));
    expect(p).toHaveLength(12);
    expect(p.map((x) => x.days)).toEqual([28, 28, 35, 28, 28, 35, 28, 28, 35, 28, 28, 35]);
    expect([toIso(p[0]!.start), toIso(p[0]!.end)]).toEqual(['2020-07-06', '2020-08-02']);
    expect([toIso(p[2]!.start), toIso(p[2]!.end)]).toEqual(['2020-08-31', '2020-10-04']);
    expect(toIso(p[11]!.end)).toBe('2021-07-04');
    expect(p.map((x) => x.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('R2 4-4-5 in a 53-week year: the last period absorbs the extra week (42 days)', () => {
    const p = periodsInYear(fy2024, rule('4-4-5'));
    expect(p).toHaveLength(12);
    expect(p[11]!.days).toBe(42);
    expect(p.reduce((a, x) => a + x.days, 0)).toBe(371);
  });

  it('R3 4-5-4 and 5-4-4 place the 5-week period in the middle and at the start', () => {
    expect(periodsInYear(fy2020, rule('4-5-4')).slice(0, 3).map((x) => x.days)).toEqual([28, 35, 28]);
    expect(periodsInYear(fy2020, rule('5-4-4')).slice(0, 3).map((x) => x.days)).toEqual([35, 28, 28]);
  });

  it('R4 13x4: thirteen 28-day periods; 35 days for the last one in a 53-week year', () => {
    const p52 = periodsInYear(fy2020, rule('13x4'));
    expect(p52).toHaveLength(13);
    expect(p52.every((x) => x.days === 28)).toBe(true);
    const p53 = periodsInYear(fy2024, rule('13x4'));
    expect(p53[12]!.days).toBe(35);
  });

  it('R5 remainderPolicy is ignored for patterns: the leftover always extends the last period', () => {
    const a = periodsInYear(fy2024, { periodLength: '4-4-5', remainderPolicy: 'shortLastPeriod' });
    const b = periodsInYear(fy2024, { periodLength: '4-4-5', remainderPolicy: 'extendLastPeriod' });
    expect(a).toEqual(b);
  });

  it('R6 a pattern on an exact-date year still works: 365 days, last period gets the odd day', () => {
    const fy = financialYearContaining(d('2020-07-01'), JULY, 'exactDate');
    const p = periodsInYear(fy, rule('4-4-5'));
    expect(p).toHaveLength(12);
    expect(toIso(p[0]!.start)).toBe('2020-07-01');
    expect(p[11]!.days).toBe(36);
  });
});

describe('calculate with the retail options', () => {
  it('C1 yearStartRule defaults to firstMondayOnOrAfter for a pattern and exactDate otherwise', () => {
    const a = calculate({ startDate: '2020-07-02', periodLength: '4-4-5' });
    const b = calculate({ startDate: '2020-07-02', periodLength: 'month' });
    expect(a.ok && a.config.yearStartRule).toBe('firstMondayOnOrAfter');
    expect(b.ok && b.config.yearStartRule).toBe('exactDate');
  });

  it('C2 an explicit rule is honoured and echoed', () => {
    const r = calculate({ startDate: '2020-07-06', periodLength: 'month', yearStartRule: 'firstMondayOnOrAfter', financialYears: 1 });
    expect(r.ok && r.config.yearStartRule).toBe('firstMondayOnOrAfter');
    expect(r.ok && r.financialYears[0]!.start).toBe('2020-07-06');
    expect(r.ok && r.financialYears[0]!.periods[0]).toMatchObject({ start: '2020-07-06', end: '2020-08-05', number: 1 }); // months anchored to the Monday
  });

  it('C3 the brief default is untouched: 2020-07-02 monthly still starts 2020-07-01', () => {
    const r = calculate({ startDate: '2020-07-02' });
    expect(r.ok && r.financialYears[0]!.periods[0]!.start).toBe('2020-07-01');
  });

  it('C4 4-4-5 from 2020-07-02: that date sits in the old year, so the first period is period 12 of 2019-2020', () => {
    const r = calculate({ startDate: '2020-07-02', periodLength: '4-4-5', financialYears: 2 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.financialYears[0]).toMatchObject({ label: '2019-2020', end: '2020-07-05', periodsInYear: 12 });
    expect(r.financialYears[0]!.periods).toHaveLength(1);
    expect(r.financialYears[0]!.periods[0]!.number).toBe(12);
    expect(r.financialYears[1]).toMatchObject({ label: '2020-2021', start: '2020-07-06', days: 364 });
    expect(r.financialYears[1]!.periods).toHaveLength(12);
  });

  it('C5 unknown yearStartRule is a validation error', () => {
    const r = calculate({ yearStartRule: 'solstice' as never });
    expect(!r.ok && r.errors[0]).toMatchObject({ field: 'yearStartRule', code: 'INVALID_ENUM' });
  });
});

function addOne(x: Ymd): Ymd {
  const dt = new Date(Date.UTC(x.y, x.m - 1, x.d) + 86_400_000);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}
