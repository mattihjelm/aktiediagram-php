## Verification

Results of the checks in tasks.md for `add-playwright-solo-tests`, run on 2026-11-18.

### Environment

- **Tools:** Node.js v24.19.0, `@playwright/test` 1.65.1, Playwright Chromium.
- **Server and data:** the PHP server is `php -S 127.0.0.1:8766 -t public`, using the per-run fixture from `e2e/fixture.js`:
  - three `.ST` stocks
  - four transactions, one of them on 2026-11-13 at 10:15
  - daily caches
  - a minute cache for `ALFA.ST`: 4 678 minutes, 2026-11-05 09:00 to the current minute
- **Reset:** `resetState()` runs before every test.

### Results

| # | Check | Expected | Observed | Result |
|---|-------|----------|----------|--------|
| 1 | Smoke tests with the shared helpers | Unchanged and passing | 6 passed | ✓ |
| 2 | First run of `solo.spec.js` | All pass | 8 passed, 2 failed. The `Nollpunkt` label is prefixed with `▼` when the breakeven is below the visible prices, as the spec allows, so the test now accepts `▲`/`▼`. The point click missed because the minute chart lay below the 720 px viewport, so the test now scrolls it into view and hovers before clicking | ✓ after fix |
| 3 | `solo.spec.js` | 10 pass | 10 passed (15.6 s) | ✓ |
| 4 | Full suite twice | All pass | "16 passed (21.1s)" and "16 passed (21.3s)" | ✓ |
| 5 | Order independence | Subsets pass alone | `smoke.spec.js` alone 6 passed; `solo.spec.js` alone 10 passed; two solo tests picked with `-g` passed alone | ✓ |
| 6 | A deliberate break | A failure is reported | A copy expecting the CSV header `fel rubrik` failed with Expected "fel rubrik", Received "time;close;currency"; the copy was removed | ✓ |
| 7 | Offline | No request outside 127.0.0.1 and no Yahoo call | The offline guard passed in every test, and minutes came from the cache (`api/intraday.php` returned at once) | ✓ |
| 8 | Real data untouched | `shasum -c` OK | All OK | ✓ |
| 9 | Deploy | `./deploy.sh -n` lists nothing from `e2e/`, `node_modules/` or Playwright files | 0 matching lines | ✓ |
| 10 | Temp cleanup | No `aktier-e2e-*` left | None | ✓ |
| 11 | PHP unit tests | Pass | "Alla 171 kontroller lyckades." | ✓ |
| 12 | `openspec validate add-playwright-solo-tests --strict` | Valid | Valid (`skip_specs`) | ✓ |

### Not verified

- **Minute-chart behavior across days with missing minutes** (rangebreaks for holidays), and **warnings from partial Yahoo fetches.** The fixture has full days and no warnings.
- **Foreign-currency stocks in the minute chart** (USD and the converted breakeven).
