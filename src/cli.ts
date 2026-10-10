import { parseArgs } from 'node:util';
import { calculate } from './calculate';
import { format } from './format';
import type { PeriodLength, PeriodsRequest, RemainderPolicy } from './types';

const HELP = `accounting-periods [startDate] [options]

  startDate            yyyy-mm-dd (default: today)
  --fy-start MM-DD     financial year start (default 07-01)
  --period <len>       week | fortnight | month | quarter (default month)
  --remainder <pol>    shortLastPeriod | extendLastPeriod (default shortLastPeriod)
  --whole-first-year   list the first year from period 1, not just from startDate
  --years <n>          financial years to show (default 2)
  --format <kind>      text | html (default text)
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
    years: { type: 'string' },
    'whole-first-year': { type: 'boolean' },
    format: { type: 'string' },
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
if (values.years) request.financialYears = Number(values.years);
if (values['whole-first-year']) request.firstYearScope = 'wholeYear';

const response = calculate(request);

if (values.json) {
  process.stdout.write(JSON.stringify(response, null, 2) + '\n');
} else {
  process.stdout.write(format(response, { kind: values.format === 'html' ? 'html' : 'text', showDays: !values['no-days'] }));
}
process.exit(response.ok ? 0 : 1);
