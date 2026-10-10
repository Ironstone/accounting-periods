import { toIso } from '../src/dates';
import { financialYearContaining, nextFinancialYear } from '../src/financialYear';

const JULY = { month: 7, day: 1 };
const JAN = { month: 1, day: 1 };
const APRIL = { month: 4, day: 1 };

describe('financialYearContaining', () => {
  it('F1 1 Jul 2020 is in FY 2020-2021', () => {
    const fy = financialYearContaining({ y: 2020, m: 7, d: 1 }, JULY);
    expect(toIso(fy.start)).toBe('2020-07-01');
    expect(toIso(fy.end)).toBe('2021-06-30');
    expect(fy.label).toBe('2020-2021');
    expect(fy.days).toBe(365);
  });

  it('F2 30 Jun 2021 (last day) is still FY 2020-2021', () => {
    expect(financialYearContaining({ y: 2021, m: 6, d: 30 }, JULY).label).toBe('2020-2021');
  });

  it('F3 1 Jul 2021 starts FY 2021-2022', () => {
    expect(financialYearContaining({ y: 2021, m: 7, d: 1 }, JULY).label).toBe('2021-2022');
  });

  it('F8 calendar year label is a single year', () => {
    const fy = financialYearContaining({ y: 2020, m: 5, d: 5 }, JAN);
    expect(fy.label).toBe('2020');
    expect(toIso(fy.start)).toBe('2020-01-01');
    expect(toIso(fy.end)).toBe('2020-12-31');
    expect(fy.days).toBe(366);
  });

  it('F9 1 April year: 2020-04-01 is FY 2020-2021 with 365 days', () => {
    const fy = financialYearContaining({ y: 2020, m: 4, d: 1 }, APRIL);
    expect(fy.label).toBe('2020-2021');
    expect(fy.days).toBe(365);
    expect(toIso(fy.end)).toBe('2021-03-31');
  });

  it('F10 nextFinancialYear is contiguous', () => {
    const fy = financialYearContaining({ y: 2020, m: 7, d: 1 }, JULY);
    const next = nextFinancialYear(fy, JULY);
    expect(toIso(next.start)).toBe('2021-07-01');
    expect(next.label).toBe('2021-2022');
  });

  it('F11 FY starting 29 Feb clamps in non-leap years and stays contiguous', () => {
    const fy = financialYearContaining({ y: 2020, m: 3, d: 1 }, { month: 2, day: 29 });
    expect(toIso(fy.start)).toBe('2020-02-29');
    expect(toIso(fy.end)).toBe('2021-02-27');
    const next = nextFinancialYear(fy, { month: 2, day: 29 });
    expect(toIso(next.start)).toBe('2021-02-28');
  });
});
