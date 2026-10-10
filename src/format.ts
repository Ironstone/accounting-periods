import { resolveFormatOptions, type FinancialYearGroup, type FormatOptions, type PeriodsResponse, type ResolvedFormatOptions, type ValidationError } from './types';

/** Display entry point: a response in, a string out. Dispatches on options.kind. */
export function format(response: PeriodsResponse, options: FormatOptions = {}): string {
  const opts = resolveFormatOptions(options);
  return opts.kind === 'html' ? formatHtml(response, opts) : formatText(response, opts);
}

// ---------------------------------------------------------------------------
// Text — matches the brief's sample exactly with default options
// ---------------------------------------------------------------------------

export function formatText(response: PeriodsResponse, opts: ResolvedFormatOptions = resolveFormatOptions()): string {
  if (!response.ok) return response.errors.map((e) => `Error: ${e.message}`).join('\n') + '\n';
  // One blank line between years, one trailing newline at the end.
  return response.financialYears.map((g) => textGroup(g, opts)).join('\n\n') + '\n';
}

function textGroup(g: FinancialYearGroup, opts: ResolvedFormatOptions): string {
  const width = 10 + opts.columnGap; // ISO date is 10 chars
  const cell = (s: string) => s.padEnd(width);
  const lines = [`Financial Year ${g.label}:`];
  if (opts.showDays) lines.push(`Days: ${g.days}`);
  lines.push('Periods:', '', `${cell('Start')}${cell('End')}Period Number`);
  for (const p of g.periods) lines.push(`${cell(p.start)}${cell(p.end)}${p.number}`);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// HTML — one <section> per financial year
// ---------------------------------------------------------------------------

export function formatHtml(response: PeriodsResponse, opts: ResolvedFormatOptions = resolveFormatOptions({ kind: 'html' })): string {
  if (!response.ok) return response.errors.map(htmlError).join('\n');
  return response.financialYears.map((g) => htmlGroup(g, opts)).join('\n');
}

function htmlError(e: ValidationError): string {
  return `<p role="alert" class="error" data-field="${esc(e.field)}">❌ Error: ${esc(e.message)}</p>`;
}

function htmlGroup(g: FinancialYearGroup, opts: ResolvedFormatOptions): string {
  const rows = g.periods.map((p) => `      <tr><td>${p.start}</td><td>${p.end}</td><td>${p.number}</td></tr>`).join('\n');
  const days = opts.showDays ? `  <p class="days">Days: ${g.days}</p>\n` : '';
  return [
    `<section class="${esc(opts.cssClass)}" data-financial-year="${esc(g.start)}">`,
    `  <h2>Financial Year ${esc(g.label)}</h2>`,
    days + `  <table>`,
    `    <thead><tr><th>Start</th><th>End</th><th>Period Number</th></tr></thead>`,
    `    <tbody>`,
    rows,
    `    </tbody>`,
    `  </table>`,
    `</section>`,
  ].join('\n');
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
