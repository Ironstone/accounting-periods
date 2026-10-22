import { calculate } from '../src/calculate';
import { DEFAULTS, type PeriodsRequest } from '../src/types';

const FIXED_NOW = new Date('2026-10-10T03:00:00Z');

function errorsOf(req: PeriodsRequest) {
  const r = calculate(req, FIXED_NOW);
  if (r.ok) throw new Error('expected ok: false');
  return r.errors;
}

describe('calculate — defaults and validation', () => {
  it('V1 empty request: every default applies and startDate is today', () => {
    const r = calculate({}, FIXED_NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.config).toEqual({ ...DEFAULTS, startDate: '2026-10-10', yearStartRule: 'exactDate' });
    expect(r.financialYears).toHaveLength(2);
    expect(r.financialYears[0]).toMatchObject({ label: '2026-2027' });
    expect(r.financialYears[0]!.periods[0]).toMatchObject({ start: '2026-10-01', number: 4 });
  });

  it('V2 unparseable startDate', () => {
    const e = errorsOf({ startDate: 'nope' });
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ field: 'startDate', code: 'INVALID_DATE' });
  });

  it('V3 impossible startDate (30 Feb)', () => {
    expect(errorsOf({ startDate: '2021-02-30' })[0]).toMatchObject({ field: 'startDate' });
  });

  it('V4 month out of range', () => {
    expect(errorsOf({ financialYearStart: { month: 13 } })[0]).toMatchObject({ field: 'financialYearStart', code: 'INVALID_MONTH' });
  });

  it('V5 day impossible for month', () => {
    expect(errorsOf({ financialYearStart: { month: 2, day: 30 } })[0]).toMatchObject({ code: 'INVALID_DAY' });
  });

  it('V5b 29 Feb is an allowed FY start', () => {
    expect(calculate({ financialYearStart: { month: 2, day: 29 }, startDate: '2020-03-01' }).ok).toBe(true);
  });

  it('V6 unknown periodLength', () => {
    expect(errorsOf({ periodLength: 'decade' as never })[0]).toMatchObject({ field: 'periodLength', code: 'INVALID_ENUM' });
  });

  it('V7 financialYears below 1', () => {
    expect(errorsOf({ financialYears: 0 })[0]).toMatchObject({ field: 'financialYears', code: 'OUT_OF_RANGE' });
    expect(errorsOf({ financialYears: 1.5 })[0]).toMatchObject({ field: 'financialYears' });
  });

  it('V8 collects every error, does not stop at the first', () => {
    const e = errorsOf({ startDate: 'x', financialYears: -1 });
    expect(e.map((x) => x.field)).toEqual(['startDate', 'financialYears']);
  });

  it('V9 partial financialYearStart: day defaults to 1', () => {
    const r = calculate({ financialYearStart: { month: 1 }, startDate: '2020-05-05' });
    expect(r.ok && r.config.financialYearStart).toEqual({ month: 1, day: 1 });
    expect(r.ok && r.financialYears[0]!.label).toBe('2020');
  });

  it('V10 the response echoes the config actually used', () => {
    const r = calculate({ startDate: '2020-07-02', periodLength: 'quarter', financialYears: 1 });
    expect(r.ok && r.config).toEqual({
      startDate: '2020-07-02',
      financialYearStart: { month: 7, day: 1 },
      periodLength: 'quarter',
      remainderPolicy: 'shortLastPeriod',
      firstYearScope: 'fromStartDate',
      yearStartRule: 'exactDate',
      financialYears: 1,
    });
    expect(r.ok && r.financialYears[0]!.periodsInYear).toBe(4);
  });

  it('V11 unknown firstYearScope', () => {
    expect(errorsOf({ firstYearScope: 'everything' as never })[0]).toMatchObject({ field: 'firstYearScope', code: 'INVALID_ENUM' });
  });

  it('V12 firstYearScope wholeYear fills the first group from period 1', () => {
    const r = calculate({ startDate: '2020-10-15', firstYearScope: 'wholeYear', financialYears: 1 });
    expect(r.ok && r.financialYears[0]!.periods).toHaveLength(12);
    expect(r.ok && r.financialYears[0]!.periods[0]).toMatchObject({ start: '2020-07-01', number: 1 });
  });
});
