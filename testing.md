# Testing — Accounting Periods

**Runner:** Vitest · **Run:** `npm test` (once) · `npm run test:watch` · `npm run test:ui` (browser view)

**Latest result (15:08):** ✅ 7 files, **67 tests passed**, 0 failed · `tsc --noEmit` clean

---

## 1. Strategy

| Layer | What is tested | How | File |
|---|---|---|---|
| Unit (pure) | date maths, FY rule | table-driven `it.each` and direct cases | `dates.test.ts`, `financialYear.test.ts` |
| Generator | snapping, numbering, all four lengths, remainder policy, infinite take | `take(n)` over the iterator | `periods.test.ts` |
| Grouping | adjacent grouping flushes per FY, never buffers | infinite source, take 3 groups, assert it returns | `grouping.test.ts` |
| Contract | defaults applied, every validation error, errors collected | `calculate()` with a fixed clock | `calculate.test.ts` |
| Golden | text output == the brief's sample | byte compare with `test/fixtures/sample.txt` | `format.test.ts` |
| HTML | structure, escaping, options | string assertions | `format.test.ts` |
| Demo | real `index.html` markup + `main.ts` drive the DOM | happy-dom environment, form events | `main.test.ts` |

No mocking. Every module except `cli.ts` and `main.ts` is pure. `calculate` takes an optional
`now` so "today" is deterministic in tests.

---

## 2. Test cases

### 2.1 Date helpers

| ID | Input | Expected | Status |
|---|---|---|---|
| D1 | endOfMonth(2021-02) | 2021-02-28 | ✅ |
| D2 | endOfMonth(2024-02) | 2024-02-29 (leap) | ✅ |
| D3 | endOfMonth(2100-02), endOfMonth(2000-02) | 28 (century), 29 (400-year) | ✅ |
| D4 | daysBetweenInclusive(2020-07-01, 2021-06-30) | 365 | ✅ |
| D5 | daysBetweenInclusive(2023-07-01, 2024-06-30) | 366 | ✅ |
| D6 | addMonths rollover and clamp | 2020-12-01+1 → 2021-01-01; 2020-01-31+1 → 2020-02-29 | ✅ |
| D7 | toIso | zero-padded | ✅ |
| D8 | parseIso | strict; rejects `2021-02-30`, `2021-2-3`, `nope` | ✅ |
| D9 | addDays across month/year ends | correct | ✅ |

### 2.2 Financial year rule

| ID | Input | Expected | Status |
|---|---|---|---|
| F1 | 2020-07-01, FY 1 Jul | 2020-07-01 → 2021-06-30, `2020-2021`, 365 | ✅ |
| F2 | 2021-06-30 | still `2020-2021` | ✅ |
| F3 | 2021-07-01 | `2021-2022` | ✅ |
| F8 | FY 1 Jan | label `2020`, 366 days | ✅ |
| F9 | FY 1 Apr, 2020-04-01 | `2020-2021`, 365, ends 2021-03-31 | ✅ |
| F10 | nextFinancialYear | contiguous | ✅ |
| F11 | FY starts 29 Feb | clamps to 28 Feb in non-leap years, stays contiguous | ✅ |

### 2.3 Period generator and lengths

| ID | Input | Expected | Status |
|---|---|---|---|
| P1 | start 2020-07-02 | 2020-07-01 → 2020-07-31, number 1 (the brief) | ✅ |
| P2 | start 2020-07-01 | identical to P1 | ✅ |
| P3 | start 2020-10-15 | 2020-10-01, number **4** | ✅ |
| P4 | start 2021-06-30 | period 12, then 2021-07-01 period 1 | ✅ |
| P5 | take(1000) | contiguous, numbers cycle 1..12 | ✅ |
| P6 | take(0) | empty | ✅ |
| P7 | start 2024-02-10 | ends 2024-02-29 | ✅ |
| P8 | 2020-02-29 weekly, `firstYearScope: wholeYear` | first item is 2019-07-01 period 1; item 35 contains 29 Feb; next year starts at 1 | ✅ |
| P9 | 2020-02-29 weekly, default scope | first item is 2020-02-24 → 2020-03-01, period 35 | ✅ |
| L1 | quarter | 4 calendar quarters | ✅ |
| L2 | quarter, start 2020-11-15 | Q2 2020-10-01 → 2020-12-31 | ✅ |
| L3 | week, shortLastPeriod, 365-day FY | 53 periods, last is 1 day (2021-06-30) | ✅ |
| L4 | week, extendLastPeriod | 52 periods, last 2021-06-23 → 2021-06-30 (8 days) | ✅ |
| L5 | fortnight, shortLastPeriod, 366-day FY | 27 periods, last is 2 days | ✅ |
| L5b | month, either policy | identical; policy is ignored for month-based lengths | ✅ |
| L6 | month, FY starts 15 Jul | 15th → 14th; period 12 ends 2021-07-14 | ✅ |
| L7 | month, FY starts 31 Jan | clamps: 31 Jan–28 Feb, 29 Feb–30 Mar, 31 Mar–29 Apr | ✅ |
| L8 | calendar year | Jan = 1, Dec = 12, label `2020` | ✅ |

### 2.4 Grouping

| ID | Input | Expected | Status |
|---|---|---|---|
| G1 | 2020-07-02, 2 groups | two full years, 12 periods each, days 365 | ✅ |
| G2 | 2020-10-15, 1 group | 9 periods from number 4; `periodsInYear` 12; days 365 (whole FY) | ✅ |
| G3 | 2023-07-01 | days 366 | ✅ |
| G4 | infinite source, 3 groups | returns | ✅ |
| G5 | finite 14 periods | 2 groups, second has 2 | ✅ |
| G6 | weekly | `periodsInYear` 53 | ✅ |

### 2.5 Calculate: defaults and validation

| ID | Input | Expected | Status |
|---|---|---|---|
| V1 | `{}` | ok; config = DEFAULTS + today; 2 years | ✅ |
| V2 | `startDate: 'nope'` | `INVALID_DATE` | ✅ |
| V3 | `startDate: '2021-02-30'` | error on `startDate` | ✅ |
| V4 | month 13 | `INVALID_MONTH` | ✅ |
| V5 | 30 Feb | `INVALID_DAY` | ✅ |
| V5b | 29 Feb | allowed | ✅ |
| V6 | `periodLength: 'decade'` | `INVALID_ENUM` | ✅ |
| V7 | `financialYears: 0` and `1.5` | `OUT_OF_RANGE` | ✅ |
| V8 | two bad fields | two errors | ✅ |
| V9 | `{ month: 1 }` only | day defaults to 1 | ✅ |
| V10 | explicit options | echoed exactly in `config` | ✅ |
| V11 | `firstYearScope: 'everything'` | `INVALID_ENUM` | ✅ |
| V12 | 2020-10-15, `wholeYear`, 1 year | 12 periods from 2020-07-01 period 1 | ✅ |

### 2.6 Format

| ID | Input | Expected | Status |
|---|---|---|---|
| T1 | 2020-07-02, 2 years, defaults | byte-identical to the brief's sample | ✅ |
| T3 | columnGap 3 and 1 | 13-char and 11-char cells | ✅ |
| H1 | html, 1 year | one `<section>`, `<h2>`, days `<p>`, 12 `<tr>` | ✅ |
| H2 | html, errors | 2 × `role="alert"`, `<` escaped | ✅ |
| H3 | text, errors | `Error:` lines | ✅ |
| H4 | showDays false (text and html) | no days line / paragraph | ✅ |
| H5 | cssClass | applied | ✅ |

### 2.7 Demo page (happy-dom)

| ID | Action | Expected | Status |
|---|---|---|---|
| M1 | load page with defaults | 2 sections, h2 `Financial Year 2020-2021`, 24 rows, config shows startDate | ✅ |
| M2 | change period length to quarter | 8 rows | ✅ |
| M3 | switch to text mode | a `<pre>` containing the brief's header line | ✅ |
| M4 | FY start 30 February | `role="alert"` shown, no table | ✅ |
| M5 | start 2020-10-15, tick whole first year | rows go from 21 to 24, first cell 2020-07-01 | ✅ |

---

## 3. Running

```bash
npm install
npm test            # single run
npm run test:watch  # TDD loop
npm run test:ui     # Vitest browser UI
npm run typecheck
npm run cli -- 2020-07-02 --years 2
npm run dev         # index.html demo
```

---

## 4. Results log

| Time | Command | Result | Notes |
|---|---|---|---|
| 14:47 | `vitest run` | ✅ 39 / 39 | core modules |
| 14:49 | `vitest run` | ❌ 57 / 58 | T1 golden: text had a blank line after the last row (double `\n`) |
| 14:50 | `vitest run` | ✅ 58 / 58 | fixed `formatText` joins |
| 14:50 | `tsc --noEmit` | ✅ | after adding `@types/node` |
| 14:50 | CLI smoke (4 runs) | ✅ | brief default, quarters + calendar year, weeks + extend, bad input exit 1 |
| 14:50 | `vite build` | ✅ | demo compiles |
| 14:53 | `vitest run` (main.test.ts) | ❌ 3 / 4 | happy-dom quirks, see §5 |
| 14:55 | `vitest run` | ✅ 62 / 62 | demo page covered |
| 15:08 | `vitest run` | ✅ 67 / 67 | firstYearScope added (P8, P9, V11, V12, M5) |
| 15:01 | headless Edge, `npm run dev` and `npm run preview` | ✅ | both render 2 `<section class="periods">`; blank page only when opened from disk |

---

## 5. Not tested (known) and environment quirks

| Gap | Why | Risk |
|---|---|---|
| Demo page in a desktop browser | rendered in headless Edge via dev server and preview (15:01) | ✅ |
| `cli.ts` arg parsing | smoke-tested by hand only | ⚠️ low |
| Property-based "no gaps for any start date and length" | time; P5 covers monthly only | ⚠️ medium. First thing to add |

happy-dom quirks worked around **in the test, never in the page**:

| Quirk | Workaround |
|---|---|
| `selected` attribute on `<option>` ignored when parsed via innerHTML | test sets the selects to the page defaults in `beforeAll` |
| `<input type=number>` clamps to `min`, so `financialYears: 0` cannot be typed | M4 uses 30 February instead |
| `RadioNodeList.value` has no setter | test sets `checked` on the radio input |
| `import.meta.url` is `http:` inside the environment | fixture path resolved from `process.cwd()` |
