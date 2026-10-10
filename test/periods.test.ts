import { parseIso, toIso, type Ymd } from '../src/dates';
import { financialYearContaining } from '../src/financialYear';
import { take } from '../src/iter';
import { periods, periodsInYear, type GeneratorConfig } from '../src/periods';

const d = (s: string): Ymd => parseIso(s)!;
const JULY = { month: 7, day: 1 };

const monthly: GeneratorConfig = { financialYearStart: JULY, periodLength: 'month', remainderPolicy: 'shortLastPeriod' };

const firstN = (start: string, cfg: GeneratorConfig, n: number) =>
  take(periods(d(start), cfg), n).map((x) => ({
    start: toIso(x.period.start),
    end: toIso(x.period.end),
    number: x.period.number,
    fy: x.fy.label,
  }));

describe('periods generator — monthly', () => {
  it('P1 the brief: 2020-07-02 snaps to 2020-07-01 .. 2020-07-31, period 1', () => {
    expect(firstN('2020-07-02', monthly, 1)[0]).toEqual({ start: '2020-07-01', end: '2020-07-31', number: 1, fy: '2020-2021' });
  });

  it('P2 starting exactly on the 1st gives the same result', () => {
    expect(firstN('2020-07-01', monthly, 1)).toEqual(firstN('2020-07-02', monthly, 1));
  });

  it('P3 mid-year start is numbered from the FY, not from 1', () => {
    expect(firstN('2020-10-15', monthly, 1)[0]).toEqual({ start: '2020-10-01', end: '2020-10-31', number: 4, fy: '2020-2021' });
  });

  it('P4 last day of the FY is period 12, then rolls to period 1', () => {
    const [a, b] = firstN('2021-06-30', monthly, 2);
    expect(a).toMatchObject({ start: '2021-06-01', number: 12, fy: '2020-2021' });
    expect(b).toMatchObject({ start: '2021-07-01', number: 1, fy: '2021-2022' });
  });

  it('P5 take(1000) returns 1000 contiguous periods with numbers cycling 1..12', () => {
    const items = take(periods(d('2020-07-02'), monthly), 1000);
    expect(items).toHaveLength(1000);
    for (let i = 1; i < items.length; i++) {
      const prevEnd = items[i - 1]!.period.end;
      const start = items[i]!.period.start;
      expect(toIso(start)).toBe(toIso(addOneDay(prevEnd)));
      expect(items[i]!.period.number).toBe((items[i - 1]!.period.number % 12) + 1);
    }
  });

  it('P6 take(0) yields nothing', () => {
    expect(take(periods(d('2020-07-02'), monthly), 0)).toEqual([]);
  });

  it('P8 firstYearScope wholeYear: 29 Feb 2020 weekly lists the year from period 1', () => {
    const cfg: GeneratorConfig = { ...monthly, periodLength: 'week', firstYearScope: 'wholeYear' };
    const items = firstN('2020-02-29', cfg, 54);
    expect(items[0]).toEqual({ start: '2019-07-01', end: '2019-07-07', number: 1, fy: '2019-2020' });
    expect(items[34]).toMatchObject({ start: '2020-02-24', end: '2020-03-01', number: 35 }); // contains 29 Feb
    expect(items[52]).toMatchObject({ number: 53, fy: '2019-2020' });
    expect(items[53]).toMatchObject({ start: '2020-07-01', number: 1, fy: '2020-2021' }); // later years unaffected
  });

  it('P9 firstYearScope fromStartDate (default): 29 Feb 2020 weekly starts at period 35', () => {
    const cfg: GeneratorConfig = { ...monthly, periodLength: 'week' };
    expect(firstN('2020-02-29', cfg, 1)[0]).toEqual({ start: '2020-02-24', end: '2020-03-01', number: 35, fy: '2019-2020' });
  });

  it('P7 February in a leap year ends on the 29th', () => {
    expect(firstN('2024-02-10', monthly, 1)[0]).toMatchObject({ start: '2024-02-01', end: '2024-02-29', number: 8 });
  });
});

describe('periodsInYear — lengths and remainder policy', () => {
  const fy2020 = financialYearContaining(d('2020-07-01'), JULY); // 365 days
  const fy2023 = financialYearContaining(d('2023-07-01'), JULY); // 366 days

  it('L1 quarters: 4 periods on calendar quarter boundaries', () => {
    const q = periodsInYear(fy2020, { periodLength: 'quarter', remainderPolicy: 'shortLastPeriod' });
    expect(q.map((p) => [toIso(p.start), toIso(p.end)])).toEqual([
      ['2020-07-01', '2020-09-30'],
      ['2020-10-01', '2020-12-31'],
      ['2021-01-01', '2021-03-31'],
      ['2021-04-01', '2021-06-30'],
    ]);
  });

  it('L2 quarterly stream from mid-November starts at Q2', () => {
    const cfg: GeneratorConfig = { ...monthly, periodLength: 'quarter' };
    expect(firstN('2020-11-15', cfg, 1)[0]).toEqual({ start: '2020-10-01', end: '2020-12-31', number: 2, fy: '2020-2021' });
  });

  it('L3 weeks, shortLastPeriod: 53 periods, the last is a single day', () => {
    const w = periodsInYear(fy2020, { periodLength: 'week', remainderPolicy: 'shortLastPeriod' });
    expect(w).toHaveLength(53);
    expect(w[52]).toMatchObject({ number: 53, days: 1 });
    expect(toIso(w[52]!.start)).toBe('2021-06-30');
    expect(w.slice(0, 52).every((p) => p.days === 7)).toBe(true);
  });

  it('L4 weeks, extendLastPeriod: 52 periods, the last has 8 days', () => {
    const w = periodsInYear(fy2020, { periodLength: 'week', remainderPolicy: 'extendLastPeriod' });
    expect(w).toHaveLength(52);
    expect(w[51]).toMatchObject({ number: 52, days: 8 });
    expect(toIso(w[51]!.start)).toBe('2021-06-23');
    expect(toIso(w[51]!.end)).toBe('2021-06-30');
  });

  it('L5 fortnights in a 366-day year, shortLastPeriod: 27 periods, last has 2 days', () => {
    const f = periodsInYear(fy2023, { periodLength: 'fortnight', remainderPolicy: 'shortLastPeriod' });
    expect(f).toHaveLength(27);
    expect(f[26]).toMatchObject({ number: 27, days: 2 });
  });

  it('L5b months are never affected by remainderPolicy', () => {
    const a = periodsInYear(fy2020, { periodLength: 'month', remainderPolicy: 'shortLastPeriod' });
    const b = periodsInYear(fy2020, { periodLength: 'month', remainderPolicy: 'extendLastPeriod' });
    expect(a).toEqual(b);
    expect(a).toHaveLength(12);
  });

  it('L6 FY starting 15 July: monthly periods run 15th to 14th', () => {
    const fy = financialYearContaining(d('2020-07-15'), { month: 7, day: 15 });
    const m = periodsInYear(fy, { periodLength: 'month', remainderPolicy: 'shortLastPeriod' });
    expect(m).toHaveLength(12);
    expect([toIso(m[0]!.start), toIso(m[0]!.end)]).toEqual(['2020-07-15', '2020-08-14']);
    expect([toIso(m[11]!.start), toIso(m[11]!.end)]).toEqual(['2021-06-15', '2021-07-14']);
  });

  it('L7 FY starting 31 Jan: period boundaries clamp to short months without drifting', () => {
    const fy = financialYearContaining(d('2020-01-31'), { month: 1, day: 31 });
    const m = periodsInYear(fy, { periodLength: 'month', remainderPolicy: 'shortLastPeriod' });
    expect([toIso(m[0]!.start), toIso(m[0]!.end)]).toEqual(['2020-01-31', '2020-02-28']);
    expect([toIso(m[1]!.start), toIso(m[1]!.end)]).toEqual(['2020-02-29', '2020-03-30']);
    expect([toIso(m[2]!.start), toIso(m[2]!.end)]).toEqual(['2020-03-31', '2020-04-29']);
    expect(toIso(m[11]!.end)).toBe('2021-01-30');
  });

  it('L8 calendar year: January is 1, December is 12, label is a single year', () => {
    const cfg: GeneratorConfig = { ...monthly, financialYearStart: { month: 1, day: 1 } };
    const items = firstN('2020-01-05', cfg, 12);
    expect(items[0]).toMatchObject({ start: '2020-01-01', number: 1, fy: '2020' });
    expect(items[11]).toMatchObject({ start: '2020-12-01', end: '2020-12-31', number: 12, fy: '2020' });
  });
});

function addOneDay(x: Ymd): Ymd {
  // tiny local helper to avoid importing more than the test needs
  const n = Date.UTC(x.y, x.m - 1, x.d) / 86_400_000 + 1;
  const dt = new Date(n * 86_400_000);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}
