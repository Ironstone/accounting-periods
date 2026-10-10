import { daysInMonth, parseIso } from './dates';
import { groupByFinancialYear } from './grouping';
import { take } from './iter';
import { periods } from './periods';
import {
  DEFAULTS,
  FIRST_YEAR_SCOPES,
  PERIOD_LENGTHS,
  REMAINDER_POLICIES,
  todayIso,
  type MonthDay,
  type PeriodsRequest,
  type PeriodsResponse,
  type ResolvedConfig,
  type ValidationError,
} from './types';

/**
 * Validate the request, apply defaults, and return either the resolved config or
 * every error found. Collects all errors rather than stopping at the first so a
 * caller can fix a form in one round trip.
 */
export function resolveConfig(request: PeriodsRequest = {}, now: Date = new Date()): { config: ResolvedConfig } | { errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const err = (field: ValidationError['field'], code: string, message: string) => errors.push({ field, code, message });

  // startDate
  const startDate = request.startDate ?? todayIso(now);
  if (parseIso(startDate) === null) {
    err('startDate', 'INVALID_DATE', `startDate must be a real date in yyyy-mm-dd form, got "${startDate}"`);
  }

  // financialYearStart (each half defaults independently: { month: 1 } means 1 Jan)
  const fyStart: MonthDay = {
    month: request.financialYearStart?.month ?? DEFAULTS.financialYearStart.month,
    day: request.financialYearStart?.day ?? DEFAULTS.financialYearStart.day,
  };
  if (!Number.isInteger(fyStart.month) || fyStart.month < 1 || fyStart.month > 12) {
    err('financialYearStart', 'INVALID_MONTH', `financialYearStart.month must be 1..12, got ${fyStart.month}`);
  } else {
    const maxDay = daysInMonth(2000, fyStart.month); // 2000 is a leap year, so 29 Feb is allowed
    if (!Number.isInteger(fyStart.day) || fyStart.day < 1 || fyStart.day > maxDay) {
      err('financialYearStart', 'INVALID_DAY', `financialYearStart.day must be 1..${maxDay} for month ${fyStart.month}, got ${fyStart.day}`);
    }
  }

  // enums
  const periodLength = request.periodLength ?? DEFAULTS.periodLength;
  if (!PERIOD_LENGTHS.includes(periodLength)) {
    err('periodLength', 'INVALID_ENUM', `periodLength must be one of ${PERIOD_LENGTHS.join(', ')}, got "${periodLength}"`);
  }
  const remainderPolicy = request.remainderPolicy ?? DEFAULTS.remainderPolicy;
  if (!REMAINDER_POLICIES.includes(remainderPolicy)) {
    err('remainderPolicy', 'INVALID_ENUM', `remainderPolicy must be one of ${REMAINDER_POLICIES.join(', ')}, got "${remainderPolicy}"`);
  }

  const firstYearScope = request.firstYearScope ?? DEFAULTS.firstYearScope;
  if (!FIRST_YEAR_SCOPES.includes(firstYearScope)) {
    err('firstYearScope', 'INVALID_ENUM', `firstYearScope must be one of ${FIRST_YEAR_SCOPES.join(', ')}, got "${firstYearScope}"`);
  }

  // bound
  const financialYears = request.financialYears ?? DEFAULTS.financialYears;
  if (!Number.isInteger(financialYears) || financialYears < 1) {
    err('financialYears', 'OUT_OF_RANGE', `financialYears must be an integer >= 1, got ${financialYears}`);
  }

  if (errors.length) return { errors };
  return { config: { startDate, financialYearStart: fyStart, periodLength, remainderPolicy, firstYearScope, financialYears } };
}

/** The calculation entry point. Never throws; errors come back in the response. */
export function calculate(request: PeriodsRequest = {}, now: Date = new Date()): PeriodsResponse {
  const resolved = resolveConfig(request, now);
  if ('errors' in resolved) return { ok: false, errors: resolved.errors };

  const { config } = resolved;
  const start = parseIso(config.startDate)!; // validated above
  const stream = periods(start, config);
  const financialYears = take(groupByFinancialYear(stream), config.financialYears);

  return { ok: true, config, financialYears };
}
