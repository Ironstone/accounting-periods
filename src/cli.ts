import { parseArgs } from 'node:util';
import { calculate } from './calculate';
import { format } from './format';
import { DATE_FORMATS, type DateFormat, type PeriodLength, type PeriodsRequest, type RemainderPolicy, type YearStartRule } from './types';

const HELP = `accounting-periods [startDate] [options]

  startDate            yyyy-mm-dd (default: today)
  --fy-start MM-DD     financial year start (default 07-01)
  --period <len>       week | fortnight | month | quarter | 4-4-5 | 4-5-4 | 5-4-4 | 13x4 (default month)
  --remainder <pol>    shortLastPeriod | extendLastPeriod (default shortLastPeriod; weeks and fortnights only)
  --year-start <rule>  exactDate | firstMondayOnOrAfter (default exactDate, or firstMondayOnOrAfter for the patterns)
  --whole-first-year   list the first year from period 1, not just from startDate
  --years <n>          financial years to show (default 2)
  --format <kind>      text | html (default text)
  --date-format <f>    iso | dmy | mdy | long (default iso)
  --weekday            prefix each date with its weekday, e.g. Mon 2020-07-06
  --no-days            hide the Days line
  --json               print the raw response instead of formatting it
  -h, --help
`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    'fy-start': { type: 'string' },
    period: { type: 'string' },
    remainder: { type: 'string' },
    'year-start': { type: 'string' },
    years: { type: 'string' },
    'whole-first-year': { type: 'boolean' },
    format: { type: 'string' },
    'date-format': { type: 'string' },
    weekday: { type: 'boolean' },
    'no-days': { type: 'boolean' },
    json: { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
  },
});

if (values.help) {
  process.stdout.write(HELP);
  process.exit(0);
}

const request: PeriodsRequest = {};
if (positionals[0]) request.startDate = positionals[0];
if (values['fy-start']) {
  const [m, d] = values['fy-start'].split('-').map(Number);
  request.financialYearStart = { month: m ?? NaN, day: d ?? 1 };
}
if (values.period) request.periodLength = values.period as PeriodLength;
if (values.remainder) request.remainderPolicy = values.remainder as RemainderPolicy;
if (values['year-start']) request.yearStartRule = values['year-start'] as YearStartRule;
if (values.years) request.financialYears = Number(values.years);
if (values['whole-first-year']) request.firstYearScope = 'wholeYear';

const response = calculate(request);

if (values.json) {
  process.stdout.write(JSON.stringify(response, null, 2) + '\n');
} else {
  const dateFormat = (values['date-format'] ?? 'iso') as DateFormat;
  if (!DATE_FORMATS.includes(dateFormat)) {
    process.stderr.write(`Error: --date-format must be one of ${DATE_FORMATS.join(', ')}, got "${dateFormat}"\n`);
    process.exit(2);
  }
  process.stdout.write(format(response, { kind: values.format === 'html' ? 'html' : 'text', showDays: !values['no-days'], dateFormat, showWeekday: !!values.weekday }));
}
process.exit(response.ok ? 0 : 1);
