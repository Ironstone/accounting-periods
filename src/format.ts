import { parseIso } from './dates';
import {
  resolveFormatOptions,
  type DateFormat,
  type FinancialYearGroup,
  type FormatOptions,
  type IsoDate,
  type PeriodsResponse,
  type ResolvedFormatOptions,
  type ValidationError,
} from './types';

/** Display entry point: a response in, a string out. Dispatches on options.kind. */
export function format(response: PeriodsResponse, options: FormatOptions = {}): string {
  const opts = resolveFormatOptions(options);
  return opts.kind === 'html' ? formatHtml(response, opts) : formatText(response, opts);
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Render an ISO date in the chosen style. Unknown input is passed through untouched. */
export function formatDate(iso: IsoDate, style: DateFormat): string {
  const d = parseIso(iso);
  if (!d) return iso;
  const dd = String(d.d).padStart(2, '0');
  const mm = String(d.m).padStart(2, '0');
  switch (style) {
    case 'dmy': return `${dd}/${mm}/${d.y}`;
    case 'mdy': return `${mm}/${dd}/${d.y}`;
    case 'long': return `${d.d} ${MONTHS[d.m - 1]} ${d.y}`;
    default: return iso;
  }
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
  const fmt = (iso: IsoDate) => formatDate(iso, opts.dateFormat);
  // Column width follows the widest rendered date so non-ISO styles still line up.
  const widest = Math.max(10, ...g.periods.flatMap((p) => [fmt(p.start).length, fmt(p.end).length]));
  const width = widest + opts.columnGap;
  const cell = (s: string) => s.padEnd(width);
  const lines = [`Financial Year ${g.label}:`];
  if (opts.showDays) lines.push(`Days: ${g.days}`);
  lines.push('Periods:', '', `${cell('Start')}${cell('End')}Period Number`);
  for (const p of g.periods) lines.push(`${cell(fmt(p.start))}${cell(fmt(p.end))}${p.number}`);
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
  const fmt = (iso: IsoDate) => formatDate(iso, opts.dateFormat);
  const rows = g.periods
    .map((p) => `      <tr><td><time datetime="${p.start}">${fmt(p.start)}</time></td><td><time datetime="${p.end}">${fmt(p.end)}</time></td><td>${p.number}</td></tr>`)
    .join('\n');
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
