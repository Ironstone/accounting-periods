// Thin browser wrapper: form → PeriodsRequest → calculate → format → DOM.
// No logic lives here; it only maps inputs to the typed request and shows the result.
import { calculate } from './calculate';
import { format } from './format';
import type { DateFormat, PeriodLength, PeriodsRequest, RemainderPolicy, YearStartRule } from './types';

const form = document.getElementById('form') as HTMLFormElement;
const output = document.getElementById('output') as HTMLDivElement;
const configEl = document.getElementById('config') as HTMLPreElement;

function readRequest(): { request: PeriodsRequest; kind: 'text' | 'html'; showDays: boolean; showWeekday: boolean; dateFormat: DateFormat } {
  const data = new FormData(form);
  const str = (k: string) => String(data.get(k) ?? '');
  const request: PeriodsRequest = {
    financialYearStart: { month: Number(str('fyMonth')), day: Number(str('fyDay')) },
    periodLength: str('periodLength') as PeriodLength,
    remainderPolicy: str('remainderPolicy') as RemainderPolicy,
    firstYearScope: data.get('wholeFirstYear') !== null ? 'wholeYear' : 'fromStartDate',
    financialYears: Number(str('financialYears')),
  };
  // A cleared date field means "use the default" (today), not an error.
  if (str('startDate')) request.startDate = str('startDate');
  // An empty year-start choice means "default for this period length".
  if (str('yearStartRule')) request.yearStartRule = str('yearStartRule') as YearStartRule;
  return {
    request,
    kind: str('kind') === 'text' ? 'text' : 'html',
    showDays: data.get('showDays') !== null,
    showWeekday: data.get('showWeekday') !== null,
    dateFormat: (str('dateFormat') || 'iso') as DateFormat,
  };
}

function render(): void {
  try {
    const { request, kind, showDays, showWeekday, dateFormat } = readRequest();
    const response = calculate(request);
    const text = format(response, { kind, showDays, showWeekday, dateFormat });

    if (kind === 'html') {
      output.innerHTML = text; // produced by our own formatter, which escapes all dynamic values
    } else {
      output.replaceChildren(Object.assign(document.createElement('pre'), { textContent: text }));
    }
    configEl.textContent = response.ok ? JSON.stringify(response.config, null, 2) : JSON.stringify(response.errors, null, 2);
  } catch (err) {
    // A blank page hides problems. Show the failure where the result would have been.
    const p = document.createElement('p');
    p.className = 'error';
    p.setAttribute('role', 'alert');
    p.textContent = `❌ The page script failed: ${err instanceof Error ? err.message : String(err)}`;
    output.replaceChildren(p);
  }
}

form.addEventListener('input', render);
form.addEventListener('submit', (e) => { e.preventDefault(); render(); });
render();
