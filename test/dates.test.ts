import { addDays, addMonths, daysBetweenInclusive, endOfMonth, parseIso, toIso } from '../src/dates';

describe('dates', () => {
  it.each([
    ['D1', 2021, 2, 28],
    ['D2', 2024, 2, 29],
    ['D3', 2100, 2, 28],
    ['D3b', 2000, 2, 29],
  ])('%s endOfMonth(%i-%i) = day %i', (_id, y, m, d) => {
    expect(endOfMonth(y, m)).toEqual({ y, m, d });
  });

  it('D4 1 Jul 2020 to 30 Jun 2021 is 365 days inclusive', () => {
    expect(daysBetweenInclusive({ y: 2020, m: 7, d: 1 }, { y: 2021, m: 6, d: 30 })).toBe(365);
  });

  it('D5 1 Jul 2023 to 30 Jun 2024 is 366 days (leap)', () => {
    expect(daysBetweenInclusive({ y: 2023, m: 7, d: 1 }, { y: 2024, m: 6, d: 30 })).toBe(366);
  });

  it('D6 addMonths rolls the year over and clamps the day', () => {
    expect(addMonths({ y: 2020, m: 12, d: 1 }, 1)).toEqual({ y: 2021, m: 1, d: 1 });
    expect(addMonths({ y: 2020, m: 1, d: 31 }, 1)).toEqual({ y: 2020, m: 2, d: 29 });
    expect(addMonths({ y: 2020, m: 3, d: 1 }, -1)).toEqual({ y: 2020, m: 2, d: 1 });
  });

  it('D7 toIso zero-pads', () => {
    expect(toIso({ y: 2020, m: 7, d: 1 })).toBe('2020-07-01');
  });

  it('D8 parseIso is strict and rejects impossible dates', () => {
    expect(parseIso('2020-07-02')).toEqual({ y: 2020, m: 7, d: 2 });
    expect(parseIso('2021-02-30')).toBeNull();
    expect(parseIso('2021-2-3')).toBeNull();
    expect(parseIso('nope')).toBeNull();
  });

  it('D9 addDays crosses month and year ends', () => {
    expect(addDays({ y: 2020, m: 12, d: 31 }, 1)).toEqual({ y: 2021, m: 1, d: 1 });
    expect(addDays({ y: 2021, m: 1, d: 1 }, -1)).toEqual({ y: 2020, m: 12, d: 31 });
  });
});
