## Verification

Results of the checks in tasks.md for `clear-comparison-when-stock-hidden`, run on 2026-11-18.

### Environment

- **Playwright:**
  - the suite in Chromium against the per-run fixture on `127.0.0.1:8766`
  - real mouse clicks on curve points, through `clickCurvePoint`
- **Manual check:**
  - local `php -S 127.0.0.1:8765 -t public` on a copy of the local `aktier.csv`, `aktiekop.csv` and `aktievy.json`
  - Chrome through the browser automation tools, with real clicks at the computed pixel positions of the curve points

### Results

| # | Check | Expected | Observed | Result |
|---|-------|----------|----------|--------|
| 1 | Two clicks create a label | `<name>: <±x,xx>% · <±x,xx>%/månad · <x,x> mån`; the help text is reset | Passing | ✓ |
| 2 | Hiding the stock in the legend | Its label is removed; another stock's label stays; it does not come back when shown again | Passing | ✓ |
| 3 | Solo on another stock | The label is removed and stays removed after unchecking | Passing | ✓ |
| 4 | Solo on the same stock | The label stays | Passing | ✓ |
| 5 | A started comparison | The help text is reset when the stock is hidden; the next click on another curve starts a new comparison | Passing | ✓ |
| 6 | Double-click outside the curves clears all; a double-click on a curve does not | Labels removed only for empty space | The first run failed: the native `dblclick` never reached the chart, because Plotly's mouse handling prevents it (a probe saw 0 native events and 2 `plotly_doubleclick`). This existing bug was fixed at the user's request by listening for `plotly_doubleclick`; see design.md. The test waits 700 ms after its last curve click before double-clicking empty space. Both tests now pass | ✓ after fix |
| 7a | Manual double-click, copy of real data | A comparison on stock A is cleared by a double-click on empty chart space; the date range is unchanged | `["A: <±x,xx>% · …"]` → `[]`; the date range is the same before and after; no console errors | ✓ |
| 7 | Manual, copy of real data | Labels on stocks A and B created; hiding A removes only A's; solo on a third stock removes B's | `["A: …", "B: …"]` → `["B: …"]` → `[]`, with solo on the third stock | ✓ |
| 8 | Console | No errors | No errors in the manual check; the Playwright console guard passed in every test | ✓ |
| 9 | `comparison.spec.js` alone; full suite twice | Pass | 7 passed; then "38 passed (57.8s)" and "38 passed (56.7s)" | ✓ |
| 10 | A deliberate break | A failure is reported | A copy that selected solo on `Gamma Test` in the same-stock test failed, as expected | ✓ |
| 11 | Real data untouched; deploy | `shasum -c` OK; `./deploy.sh -n` lists only app files | All OK; it lists `public/assets/chart.js` and no test files | ✓ |
| 12 | PHP unit tests and `openspec validate clear-comparison-when-stock-hidden --strict` | Pass | "Alla 171 kontroller lyckades."; valid | ✓ |

### Not verified

- Nothing beyond what is listed in the table.

### Hosted check

- **2026-11-18:** The user uploaded the change to the web host and confirmed that it works.
