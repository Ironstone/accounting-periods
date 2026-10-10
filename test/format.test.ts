import { readFileSync } from 'node:fs';
import { calculate } from '../src/calculate';
import { format } from '../src/format';
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

describe('format — html', () => {
  const ok = calculate({ startDate: '2020-07-02', financialYears: 1 });

  it('H1 one section per year with a 12-row table', () => {
    const html = format(ok, { kind: 'html' });
    expect(html.match(/<section class="periods"/g)).toHaveLength(1);
    expect(html).toContain('<h2>Financial Year 2020-2021</h2>');
    expect(html).toContain('<p class="days">Days: 365</p>');
    expect(html.match(/<tbody>[\s\S]*<\/tbody>/)![0].match(/<tr>/g)).toHaveLength(12);
    expect(html).toContain('<tr><td>2020-07-01</td><td>2020-07-31</td><td>1</td></tr>');
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
