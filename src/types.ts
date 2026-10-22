/**
 * Contracts for the accounting-periods calculator.
 *
 * Rule R8: everything is configurable and every option has a default.
 * `DEFAULTS` is the single source of truth for those defaults; `ResolvedConfig`
 * is the request after defaults have been applied, and it is echoed back in
 * every successful response so the caller can see what was actually used.
 */

/** Calendar date as `yyyy-mm-dd`. No time, no zone. */
export type IsoDate = string;

/** Day and month that a financial year starts on. Default 1 July (ends 30 June). */
export interface MonthDay {
  month: number; // 1..12
  day: number;   // 1..31, must exist in that month
}

/**
 * Period lengths. The last four are retail calendars: each quarter is split into
 * three periods of the given number of WEEKS (4-4-5 = 13 weeks a quarter, 12 periods a
 * year), or thirteen 4-week periods. They are meant to run with yearStartRule
 * 'firstMondayOnOrAfter' so every year is exactly 52 or 53 whole weeks.
 */
export const PERIOD_LENGTHS = ['week', 'fortnight', 'month', 'quarter', '4-4-5', '4-5-4', '5-4-4', '13x4'] as const;
export type PeriodLength = (typeof PERIOD_LENGTHS)[number];

export const PATTERN_LENGTHS: readonly PeriodLength[] = ['4-4-5', '4-5-4', '5-4-4', '13x4'];
export function isPatternLength(length: PeriodLength): boolean {
  return PATTERN_LENGTHS.includes(length);
}

/**
 * Where a financial year actually begins relative to the nominal financialYearStart.
 * - exactDate: on that day and month (1 July is 1 July).
 * - firstMondayOnOrAfter: on the first Monday on or after it, so the year is 52 or 53 whole weeks.
 * Default is exactDate, except for the pattern period lengths, which default to firstMondayOnOrAfter.
 */
export const YEAR_START_RULES = ['exactDate', 'firstMondayOnOrAfter'] as const;
export type YearStartRule = (typeof YEAR_START_RULES)[number];

/**
 * Weeks and fortnights never divide a 365/366-day year exactly.
 * - shortLastPeriod: keep every period a full length and add a short final one (53 weeks).
 * - extendLastPeriod: fold the leftover days into the final full period (52 weeks).
 */
export const REMAINDER_POLICIES = ['shortLastPeriod', 'extendLastPeriod'] as const;
export type RemainderPolicy = (typeof REMAINDER_POLICIES)[number];

/**
 * Which periods of the FIRST financial year are returned when startDate falls mid-year.
 * - fromStartDate: only the period containing startDate and later (the brief's "from a given start date").
 * - wholeYear: every period of that year, so the listing always begins at period 1.
 */
export const FIRST_YEAR_SCOPES = ['fromStartDate', 'wholeYear'] as const;
export type FirstYearScope = (typeof FIRST_YEAR_SCOPES)[number];

/** What the caller sends. Every field is optional; see DEFAULTS. */
export interface PeriodsRequest {
  startDate?: IsoDate;
  financialYearStart?: Partial<MonthDay>;
  periodLength?: PeriodLength;
  remainderPolicy?: RemainderPolicy;
  firstYearScope?: FirstYearScope;
  yearStartRule?: YearStartRule;
  /** How many financial years to return. The underlying stream is infinite. */
  financialYears?: number;
}

/** The request with every default applied. */
export interface ResolvedConfig {
  startDate: IsoDate;
  financialYearStart: MonthDay;
  periodLength: PeriodLength;
  remainderPolicy: RemainderPolicy;
  firstYearScope: FirstYearScope;
  yearStartRule: YearStartRule;
  financialYears: number;
}

export interface Period {
  start: IsoDate;
  end: IsoDate;
  /** 1-based position inside its financial year. */
  number: number;
  days: number;
}

export interface FinancialYearGroup {
  /** "2020-2021", or "2020" when the year starts and ends in one calendar year. */
  label: string;
  start: IsoDate;
  end: IsoDate;
  /** Length of the whole financial year, inclusive of both ends. */
  days: number;
  /** How many periods the whole year has (12, 4, 52/53, 26/27). */
  periodsInYear: number;
  /** From the request's startDate onward, or the whole first year when firstYearScope = wholeYear. */
  periods: Period[];
}

export interface ValidationError {
  field: keyof PeriodsRequest | 'request';
  code: string;
  message: string;
}

export type PeriodsResponse =
  | { ok: true; config: ResolvedConfig; financialYears: FinancialYearGroup[] }
  | { ok: false; errors: ValidationError[] };

/**
 * How dates are written in the output.
 * iso 2020-07-01 · dmy 01/07/2020 · mdy 07/01/2020 · long 1 Jul 2020
 */
export const DATE_FORMATS = ['iso', 'dmy', 'mdy', 'long'] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

/** Display options. Every field has a default; see FORMAT_DEFAULTS. */
export interface FormatOptions {
  kind?: 'text' | 'html';
  dateFormat?: DateFormat;
  /** Prefix each date with its weekday, e.g. "Mon 2020-07-06". Off by default to match the brief. */
  showWeekday?: boolean;
  /** Spaces after each date cell in text mode. The sample uses 3. */
  columnGap?: number;
  showDays?: boolean;
  /** Class on each <section> in html mode. */
  cssClass?: string;
}

export type ResolvedFormatOptions = Required<FormatOptions>;

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/** Today's date as yyyy-mm-dd in UTC. Isolated so tests can override it. */
export function todayIso(now: Date = new Date()): IsoDate {
  return now.toISOString().slice(0, 10);
}

export const DEFAULTS: Omit<ResolvedConfig, 'startDate' | 'yearStartRule'> = {
  financialYearStart: { month: 7, day: 1 },
  periodLength: 'month',
  remainderPolicy: 'shortLastPeriod',
  firstYearScope: 'fromStartDate',
  financialYears: 2,
};

/** yearStartRule's default follows the period length: whole weeks for the retail patterns. */
export function defaultYearStartRule(periodLength: PeriodLength): YearStartRule {
  return isPatternLength(periodLength) ? 'firstMondayOnOrAfter' : 'exactDate';
}

export const FORMAT_DEFAULTS: ResolvedFormatOptions = {
  kind: 'text',
  dateFormat: 'iso',
  showWeekday: false,
  columnGap: 3,
  showDays: true,
  cssClass: 'periods',
};

export function resolveFormatOptions(options: FormatOptions = {}): ResolvedFormatOptions {
  return { ...FORMAT_DEFAULTS, ...stripUndefined(options) };
}

/** Spread-friendly: drops keys whose value is undefined so they do not clobber defaults. */
export function stripUndefined<T extends object>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}
