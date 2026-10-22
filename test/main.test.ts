// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Smoke test for the browser glue: load the real index.html markup, run main.ts,
 * and check that the form drives calculate → format → DOM.
 */
describe('demo page (index.html + main.ts)', () => {
  beforeAll(async () => {
    // import.meta.url is an http: URL under happy-dom, so resolve from the project root instead.
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const body = /<body>([\s\S]*)<\/body>/.exec(html)![1]!.replace(/<script[\s\S]*?<\/script>/, '');
    document.body.innerHTML = body;
    await import('../src/main');
    // happy-dom ignores the `selected` attribute on <option> parsed via innerHTML (a real
    // browser honours it), so put the selects at the page's intended defaults explicitly.
    set('fyMonth', '7');
    set('periodLength', 'month');
  });

  const output = () => document.getElementById('output')!;
  // happy-dom over-counts the descendant selector "tbody tr"; cells / 3 is unambiguous.
  const rows = () => output().querySelectorAll('td').length / 3;
  const form = () => document.getElementById('form') as HTMLFormElement;
  const set = (name: string, value: string) => {
    const el = form().elements.namedItem(name) as HTMLInputElement | HTMLSelectElement;
    el.value = value;
    form().dispatchEvent(new Event('input', { bubbles: true }));
  };

  it('M1 renders two HTML sections for the default form values', () => {
    expect(output().querySelectorAll('section.periods')).toHaveLength(2);
    expect(output().querySelector('h2')!.textContent).toBe('Financial Year 2020-2021');
    expect(rows()).toBe(24);
    expect(document.getElementById('config')!.textContent).toContain('"startDate": "2020-07-02"');
  });

  it('M2 changing period length re-renders: quarters give 8 rows', () => {
    set('periodLength', 'quarter');
    expect(rows()).toBe(8);
  });

  it('M3 text mode shows a <pre> with the brief header line', () => {
    set('periodLength', 'month');
    (form().querySelector('input[name="kind"][value="text"]') as HTMLInputElement).checked = true;
    form().dispatchEvent(new Event('input', { bubbles: true }));
    const pre = output().querySelector('pre');
    expect(pre).not.toBeNull();
    expect(pre!.textContent).toContain('Start        End          Period Number');
  });

  it('M5 whole-first-year checkbox lists the first year from period 1', () => {
    (form().querySelector('input[name="kind"][value="html"]') as HTMLInputElement).checked = true;
    set('startDate', '2020-10-15');
    expect(rows()).toBe(9 + 12);
    (form().querySelector('input[name="wholeFirstYear"]') as HTMLInputElement).checked = true;
    form().dispatchEvent(new Event('input', { bubbles: true }));
    expect(rows()).toBe(24);
    expect(output().querySelector('tbody td')!.textContent).toBe('2020-07-01');
  });

  it('M6 choosing 4-4-5 applies the Monday rule by default: first full year starts 2020-07-06', () => {
    (form().querySelector('input[name="kind"][value="html"]') as HTMLInputElement).checked = true;
    (form().querySelector('input[name="wholeFirstYear"]') as HTMLInputElement).checked = false;
    set('startDate', '2020-07-06');
    set('periodLength', '4-4-5');
    expect(rows()).toBe(24);
    expect(output().querySelector('tbody td')!.textContent).toBe('2020-07-06');
    expect(document.getElementById('config')!.textContent).toContain('"yearStartRule": "firstMondayOnOrAfter"');
  });

  it('M4 an invalid request (30 February) shows an alert, not a table', () => {
    // happy-dom clamps <input type=number> to its min, so an out-of-range year count cannot be typed here.
    (form().querySelector('input[name="kind"][value="html"]') as HTMLInputElement).checked = true;
    set('fyMonth', '2');
    set('fyDay', '30');
    expect(output().querySelectorAll('[role="alert"]').length).toBeGreaterThan(0);
    expect(output().querySelector('table')).toBeNull();
  });
});
