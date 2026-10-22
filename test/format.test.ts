import { readFileSync } from 'node:fs';
import { calculate } from '../src/calculate';
import { format, formatDate } from '../src/format';
import type { PeriodsResponse } from '../src/types';

const sample = readFileSync(new URL('./fixtures/sample.txt', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

const errorResponse: PeriodsResponse = {
  ok: false,
  errors: [
    { field: 'startDate', code: 'INVALID_DATE', message: 'bad <date>' },
    { field: 'financialYears', code: 'OUT_OF_RANGE', message: 'too small' },
  ],
};

describe('format — text', () => {
  it("T1 golden: default options reproduce the brief's sample for 2020-07-02", () => {
    const out = format(calculate({ startDate: '2020-07-02', financialYears: 2 }));
    expect(out).toBe(sample);
  });

  it('T3 date cells are 13 chars wide by default, 10 + columnGap otherwise', () => {
    const r = calculate({ startDate: '2020-07-02', financialYears: 1 });
    expect(format(r).split('\n')[4]).toBe('Start        End          Period Number');
    expect(format(r, { columnGap: 1 }).split('\n')[4]).toBe('Start      End        Period Number');
  });

  it('H3 errors render as Error: lines', () => {
    expect(format(errorResponse)).toBe('Error: bad <date>\nError: too small\n');
  });

  it('H4 showDays false drops the Days line', () => {
    const out = format(calculate({ startDate: '2020-07-02', financialYears: 1 }), { showDays: false });
    expect(out).not.toContain('Days:');
    expect(out.split('\n')[1]).toBe('Periods:');
  });
});

describe('format — dateFormat', () => {
  const one = calculate({ startDate: '2020-07-02', financialYears: 1 });

  it.each([
    ['iso', '2020-07-01', '2020-07-31'],
    ['dmy', '01/07/2020', '31/07/2020'],
    ['mdy', '07/01/2020', '07/31/2020'],
    ['long', '1 Jul 2020', '31 Jul 2020'],
  ] as const)('F-%s renders the first row as %s to %s', (style, start, end) => {
    expect(formatDate('2020-07-01', style)).toBe(start);
    const row = format(one, { dateFormat: style }).split('\n')[5]!;
    expect(row.startsWith(start)).toBe(true);
    expect(row).toContain(end);
    expect(row.trimEnd().endsWith('1')).toBe(true);
  });

  it('F-width: columns widen to the longest rendered date and stay aligned', () => {
    const lines = format(one, { dateFormat: 'long' }).split('\n');
    const header = lines[4]!;
    const cells = lines.slice(5).filter(Boolean).flatMap((l) => l.split(/\s{3,}/).slice(0, 2));
    const widest = Math.max(...cells.map((c) => c.length)); // "31 Jul 2020" = 11
    expect(header.indexOf('End')).toBe(widest + 3);
    expect(header.indexOf('Period Number')).toBe(2 * (widest + 3));
  });

  it('F-html: cells keep the ISO value in a <time datetime> attribute', () => {
    const html = format(one, { kind: 'html', dateFormat: 'dmy' });
    expect(html).toContain('<time datetime="2020-07-01">01/07/2020</time>');
  });

  it('F-weekday: showWeekday prefixes dates in text and html and widens the columns', () => {
    expect(formatDate('2020-07-06', 'iso', true)).toBe('Mon 2020-07-06');
    expect(formatDate('2020-07-05', 'long', true)).toBe('Sun 5 Jul 2020');
    const text = format(one, { showWeekday: true });
    expect(text.split('\n')[4]).toBe('Start            End              Period Number');
    expect(text.split('\n')[5]).toBe('Wed 2020-07-01   Fri 2020-07-31   1');
    const html = format(one, { kind: 'html', showWeekday: true });
    expect(html).toContain('<time datetime="2020-07-01">Wed 2020-07-01</time>');
    expect(format(one)).not.toContain('Wed'); // default stays off
  });

  it('F-passthrough: a non-ISO string is returned untouched', () => {
    expect(formatDate('not a date', 'long')).toBe('not a date');
  });
});

describe('format — html', () => {
  const ok = calculate({ startDate: '2020-07-02', financialYears: 1 });

  it('H1 one section per year with a 12-row table', () => {
    const html = format(ok, { kind: 'html' });
    expect(html.match(/<section class="periods"/g)).toHaveLength(1);
    expect(html).toContain('<h2>Financial Year 2020-2021</h2>');
    expect(html).toContain('<p class="days">Days: 365</p>');
    expect(html.match(/<tbody>[\s\S]*<\/tbody>/)![0].match(/<tr>/g)).toHaveLength(12);
    expect(html).toContain('<tr><td><time datetime="2020-07-01">2020-07-01</time></td><td><time datetime="2020-07-31">2020-07-31</time></td><td>1</td></tr>');
  });

  it('H2 errors render as role=alert paragraphs with escaping', () => {
    const html = format(errorResponse, { kind: 'html' });
    expect(html.match(/role="alert"/g)).toHaveLength(2);
    expect(html).toContain('bad &lt;date&gt;');
  });

  it('H4 showDays false drops the days paragraph', () => {
    expect(format(ok, { kind: 'html', showDays: false })).not.toContain('class="days"');
  });

  it('H5 cssClass is applied', () => {
    expect(format(ok, { kind: 'html', cssClass: 'x' })).toContain('<section class="x"');
  });
});
