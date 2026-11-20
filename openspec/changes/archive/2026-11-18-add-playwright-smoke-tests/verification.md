## Verification

Results of the checks in tasks.md for `add-playwright-smoke-tests`, run on 2026-11-18.

### Environment

- **Machine:** Node.js v24.19.0, npm 11.17.0, `@playwright/test` 1.65.1.
- **Browser:** Chrome Headless Shell 159 (Playwright Chromium), downloaded to `~/Library/Caches/ms-playwright`.
- **Server and data:** each run's PHP server is `php -S 127.0.0.1:8766 -t public`, with `AKTIER_CONFIG` pointing to a fixture in `$TMPDIR/aktier-e2e-*`. The fixture is created by `playwright.config.js` and holds three synthetic `.ST` stocks, three transactions, fresh price caches and a random test password.

### Results

| # | Check | Expected | Observed | Result |
|---|-------|----------|----------|--------|
| 1 | First run | All smoke tests pass | 5 passed, 1 failed: the wrong-password test saw the browser's console line for the expected HTTP 401. The test now filters only that line | ✓ after fix |
| 2 | Two runs in a row | All pass | "6 passed (6.5s)" and "6 passed (6.1s)" | ✓ |
| 3 | A deliberate break | A failure is reported | A copy of the spec expecting the legend name `Fel namn` failed with the expected/received diff. The copy and `test-results/` were removed afterwards | ✓ |
| 4 | Offline | No request outside 127.0.0.1; `api/history.php` returns `needed: []` | The offline guard and the history assertion passed in every test | ✓ |
| 5 | Temp cleanup | No `aktier-e2e-*` directory left | None left after the runs, including the failed one | ✓ |
| 6 | Real data untouched | `shasum -c` OK; `private/config.php` not used | All OK | ✓ |
| 7 | Deploy | `./deploy.sh -n` lists nothing from `e2e/`, `node_modules/` or the root config files | It listed only `private/src/Chart.php`, `public/api/view-range.php`, `public/assets/app.css` and `public/assets/chart.js`. These app files changed in the previous change, after the last `.deploy-stamp` | ✓ |
| 8 | PHP unit tests | Pass | "Alla 171 kontroller lyckades." | ✓ |
| 9 | `openspec validate add-playwright-smoke-tests --strict` | Valid | Valid (`skip_specs`) | ✓ |

### Design note

Playwright starts `webServer` before `globalSetup`, as `createGlobalSetupTasks` in Playwright 1.65 shows. The fixture is therefore created in `playwright.config.js`, and design.md was updated to match.

### Not verified

- **Other browsers.** Only Chromium was run, by design.
- **Solo/minute chart, import, CSV download, registering transactions and scale modes.** They are not covered by these smoke tests.
