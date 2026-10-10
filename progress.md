# Progress — Accounting Periods

**Start:** 14:25 · **Deadline:** 15:25 · Legend: ✅ done · ⏳ in progress · ⏸️ blocked · ➖ not started · ❌ dropped · ⚠️ done with caveat

---

## Checklist

| # | Task | Status | Time | Notes |
|---|---|---|---|---|
| 0.1 | Read brief, confirm folder is empty apart from brief | ✅ | 14:26 | no starter code; "the code is the starting point" means **our** code |
| 0.2 | planning.md, testing.md, decisions.md, progress.md, interview-notes.md | ✅ | 14:35 | |
| 0.3 | Re-plan for Brian's parameter + calc/format split requirements | ✅ | 14:44 | planning.md §3–§5 rewritten; decisions A10–A16; tests V, L, H |
| 1.1 | npm scaffold, install vite / vitest / typescript | ✅ | 14:44 | |
| 1.2 | tsconfig (strict, ESM), vite config, npm scripts | ✅ | 14:45 | |
| 1.3 | `src/types.ts` with every contract and `DEFAULTS` | ✅ | 14:45 | |
| 2.1 | `src/dates.ts` + tests D1–D9 | ✅ | 14:47 | |
| 2.2 | `src/financialYear.ts` + tests F1–F11 | ✅ | 14:47 | |
| 3.1 | `src/periods.ts` all four lengths + remainder policy, tests P1–P7, L1–L8 | ✅ | 14:47 | |
| 3.2 | `src/grouping.ts` adjacent grouping + tests G1–G6 | ✅ | 14:47 | 39 tests green |
| 4.1 | `src/calculate.ts` validation + defaults, tests V1–V10 | ✅ | 14:49 | |
| 4.2 | `src/format.ts` text + html, golden fixture, tests T1–T3, H1–H5 | ✅ | 14:50 | golden failed once on a doubled trailing newline; fixed |
| 4.3 | `src/cli.ts` + `npm run cli` | ✅ | 14:50 | needed `tsx` + `@types/node`; vitest 5 dropped vite-node |
| 5.1 | `index.html` + `src/main.ts` demo | ✅ | 14:55 | `vite build` passes; happy-dom test M1–M4 loads the real markup and drives the form. Not opened in a desktop browser |
| 5.2 | `npm run test:ui` check | ➖ | | not run; `@vitest/ui` is installed |
| 5.3 | README.md, .gitignore | ✅ | 14:51 | |
| 6.1 | Full test run green, results logged in testing.md | ✅ | 14:55 | 62 / 62 |
| 6.2 | decisions.md updated with what was learned while coding | ✅ | 14:56 | A17–A23 |
| 6.3 | Final interview-notes.md pass | ✅ | 14:52 | |

---

## Timeline

| Time | Event |
|---|---|
| 14:25 | Exercise started |
| 14:26 | Folder reviewed: only `accounting-periods.md` present |
| 14:28 | Language changed from C# to TypeScript (decisions T1) |
| 14:35 | Tracking files written |
| 14:36 | Brian added: configurable FY start, period length enum, calc/format split, typed request/response with errors |
| 14:44 | Plan revised, dependencies installed |
| 14:47 | Core (dates, FY, periods, grouping): 39 tests green |
| 14:50 | calculate, format, CLI: 58 tests green; CLI output matches the brief |
| 14:50 | Demo page builds |
| 14:52 | Docs updated |
| 14:53 | happy-dom test for the demo page; three happy-dom quirks worked around in the test (see testing.md §5) |
| 14:55 | 62 / 62 green. Done with ~30 minutes of the hour left |

---

## Verification evidence

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ exit 0 |
| `npx vitest run` | ✅ 7 files, 74 tests, 0 failed |
| `npm run cli -- 2020-07-02` | ✅ byte-identical to the brief's sample (golden test T1) |
| `npm run cli -- 2020-02-30 --years 0` | ✅ two errors, exit code 1 |
| `npx vite build` | ✅ dist/index.html + one JS chunk |
| Demo page under happy-dom (M1–M4) | ✅ renders, re-renders on input, text mode, error alert |
| Demo page in a desktop browser | ⚠️ not run (`npm run dev`) |

---

## Risks

| Risk | Mitigation | Status |
|---|---|---|
| `npm install` slow or offline | — | ✅ installed in under a minute |
| Golden test brittle on line endings | fixture read normalises `\r\n` to `\n` | ✅ |
| Demo page eats the last 10 min | built and DOM-tested in 5 minutes | ✅ |
| Huge `financialYears` (e.g. 10⁶ weekly) will be slow | not capped; a cap would be one more validation line | ➖ noted |

---

## Follow-up (14:58)

| # | Task | Status | Time | Notes |
|---|---|---|---|---|
| 7.1 | Brian: page shows no output | ✅ | 15:00 | reproduced as "script never ran"; via `npm run dev` headless Edge renders both years. Cause: opened from disk. Page now says so instead of staying blank (A24) |
| 7.2 | Brian: README as the first-read document | ✅ | 15:00 | problem → what was built → set up → test → view → options → code use → judgement calls |
| 7.3 | Brian: 29 Feb 2020 weekly shows periods 35–53 only | ✅ | 15:08 | by design (from start date), but ambiguous. New parameter `firstYearScope` with default unchanged; `wholeYear` option on CLI and page (A25). Tests P8, P9, V11, V12, M5 |
| 8.1 | Brian: publish as a public repo on the ironstone account | ✅ | 15:12 | https://github.com/Ironstone/accounting-periods created; pushed after 8.2 |
| 8.2 | Brian: date format option for the output | ✅ | 15:14 | `dateFormat` iso / dmy / mdy / long on `format`, CLI `--date-format`, page select. Tests F-iso…F-long, F-width, F-html, F-passthrough (A26) |
| 9.1 | Final regression run | ✅ | 15:17 | tsc, 74/74 tests, clean build, CLI golden identical to the brief, 10 CLI variants, dev + preview pages render in headless Edge, working tree clean and equal to origin/main |
