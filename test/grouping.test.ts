import { parseIso, type Ymd } from '../src/dates';
import { groupByFinancialYear } from '../src/grouping';
import { take } from '../src/iter';
import { periods, type GeneratorConfig } from '../src/periods';

const d = (s: string): Ymd => parseIso(s)!;
const monthly: GeneratorConfig = { financialYearStart: { month: 7, day: 1 }, periodLength: 'month', remainderPolicy: 'shortLastPeriod' };

describe('groupByFinancialYear', () => {
  it('G1 two full years from the brief start date', () => {
    const [a, b] = take(groupByFinancialYear(periods(d('2020-07-02'), monthly)), 2);
    expect(a).toMatchObject({ label: '2020-2021', start: '2020-07-01', end: '2021-06-30', days: 365, periodsInYear: 12 });
    expect(a!.periods).toHaveLength(12);
    expect(a!.periods[0]).toEqual({ start: '2020-07-01', end: '2020-07-31', number: 1, days: 31 });
    expect(a!.periods[11]).toEqual({ start: '2021-06-01', end: '2021-06-30', number: 12, days: 30 });
    expect(b).toMatchObject({ label: '2021-2022', days: 365 });
    expect(b!.periods).toHaveLength(12);
  });

  it('G2 mid-year start: partial first group, but days is the whole FY', () => {
    const [a] = take(groupByFinancialYear(periods(d('2020-10-15'), monthly)), 1);
    expect(a!.periods).toHaveLength(9);
    expect(a!.periods[0]!.number).toBe(4);
    expect(a!.periodsInYear).toBe(12);
    expect(a!.days).toBe(365);
  });

  it('G3 a year containing 29 Feb has 366 days', () => {
    const [a] = take(groupByFinancialYear(periods(d('2023-07-01'), monthly)), 1);
    expect(a!.days).toBe(366);
  });

  it('G4 returns from an infinite source (no buffering)', () => {
    const groups = take(groupByFinancialYear(periods(d('2020-07-02'), monthly)), 3);
    expect(groups.map((g) => g.label)).toEqual(['2020-2021', '2021-2022', '2022-2023']);
  });

  it('G5 finite source flushes the trailing partial group', () => {
    const fourteen = take(periods(d('2020-07-02'), monthly), 14);
    const groups = [...groupByFinancialYear(fourteen)];
    expect(groups).toHaveLength(2);
    expect(groups[1]!.periods).toHaveLength(2);
  });

  it('G6 weekly grouping reports periodsInYear 53', () => {
    const [a] = take(groupByFinancialYear(periods(d('2020-07-02'), { ...monthly, periodLength: 'week' })), 1);
    expect(a!.periodsInYear).toBe(53);
    expect(a!.periods).toHaveLength(53);
  });
});
