# Interview notes — talking points

The interview is about **how I got there** and **how I adapt it**. Lead with these, in order.

---

## 1. How I got there (2 minutes)

| Step | What I did | Evidence |
|---|---|---|
| 1 | Pulled 11 concrete requirements out of a 4-paragraph brief plus the extra asks | planning.md §2 |
| 2 | Listed every ambiguity and made a written call on each, with how to reverse it | decisions.md §1, §5 |
| 3 | Defined the parameters first, each with a default, before any logic | planning.md §3, `src/types.ts` |
| 4 | Wrote the test table before the code, then coded to it | testing.md §2 |
| 5 | Split calculation from display behind two typed functions | `calculate()`, `format()` |
| 6 | Time-boxed with the browser demo as a stretch so the core always shipped | progress.md |

---

## 2. The four design points worth saying out loud

* **"Potentially infinite" is the whole exercise.** A generator plus `take(n)` is the honest
  answer. The typed response has to be finite, so `financialYears` is where the bound lives.
* **Grouping an infinite stream.** `groupBy` never returns. Adjacent grouping that flushes
  when the FY key changes is lazy and correct because periods arrive in order.
* **Period numbering belongs to the financial year, not the start date.** Starting in
  October gives period 4; starting mid-year with weeks gives week 15. One rule.
* **One boundary algorithm for every period length.** Period *i* starts at
  `fyStart + i × length`, anchored to the FY start so months never drift, capped at the FY end.
  Weeks and fortnights leave a remainder, so that became a parameter rather than a guess.

---

## 3. A decision I would raise myself

**Days in a partially covered year.** When the start date is October, the first group shows
9 periods but `days: 365`. I read "days in each financial year" as a property of the year.
Phil may want the covered days instead. The group already has `periodsInYear` beside the
actual period count, so `coveredDays` beside `days` is the same shape and a two-line change.

---

## 4. Pivots I expect and my answer

| Phil says | My answer | Where |
|---|---|---|
| "Year end is 31 December" | `financialYearStart: { month: 1 }`; tested (L8, F8) | parameter |
| "Make them quarters" | `periodLength: 'quarter'`; tested (L1, L2) | parameter |
| "Fortnightly pay periods" | `periodLength: 'fortnight'`; 26 or 27 by `remainderPolicy` | parameter |
| "52 weeks, not 53" | `remainderPolicy: 'extendLastPeriod'`; tested (L4) | parameter |
| "Show the days actually covered" | add `coveredDays` to the group; renderer picks | `grouping.ts`, `format.ts` |
| "Start on the real date, not the 1st" | new option `snapToPeriodStart: false`; trims the first period | `periods.ts` |
| "Give me JSON" | `--json` already exists; the response **is** the JSON | done |
| "Run to an end date" | new option `endDate`, `takeWhile` instead of `take` | `calculate.ts` |
| "4-4-5 retail calendar" | new `periodLength` member with a pattern-based `advance` | `periods.ts` |
| "UK tax year, 6 April" | `financialYearStart: { month: 4, day: 6 }` already works; periods run 6th to 5th (L6 pattern) | parameter |

---

## 5. What I would do with another hour

* Property-based test: for any start date and any length, periods are gap-free, numbers run
  1..`periodsInYear`, and every FY has exactly `periodsInYear` periods.
* Open the demo in a browser and add a Playwright smoke test.
* Cap `financialYears` so a careless caller cannot ask for a million weekly years.
* `coveredDays` on the group so §3 is a non-issue.
