## Verification

Results of the checks in tasks.md for `add-playwright-scale-tests`, run on 2026-11-18.

### Environment

- **Tools:** Node.js v24.19.0, `@playwright/test` 1.65.1, Playwright Chromium.
- **Server:** `php -S 127.0.0.1:8766 -t public`.
- **Fixture:** per-run, from `e2e/fixture.js`. `resetState()` runs before every test, so `aktievy.json` starts without `scale`.

### Results

| # | Check | Expected | Observed | Result |
|---|-------|----------|----------|--------|
| 1 | First run of `scale.spec.js` | All pass | 7 passed, 1 failed. The default test expected no measure traces, but the overlay traces always exist (seeded) and are only visible in `Logaritmisk` + a measure. The tests now count visible measure traces, and design.md records this | ✓ after fix |
| 2 | `scale.spec.js` alone | 8 pass | 8 passed (12.9 s) | ✓ |
| 3 | Rules | `Linjär` excludes the rest; one measure at a time; `Logaritmisk` + a measure allowed; the last box unchecked gives `Linjär` | Asserted through the checkboxes in tests 2–6 | ✓ |
| 4 | Chart state | Log axis with hidden ticks and one axis per stock; percent axis with the measure's title; drawdown ≤ 0; one visible measure trace per visible stock on a visible percent axis; a hidden stock hides its measure trace | All asserted and passing | ✓ |
| 5 | Saved value | `log` with `log_scale: true`, `ma200`, `drawdown`, `log_change63`, `linear` | Polled from `aktievy.json`; passing | ✓ |
| 6 | Reload and legacy | `log_drawdown` restored; `{log_scale: true}` alone opens in `Logaritmisk` | Passing | ✓ |
| 7 | Full suite twice | All pass | "36 passed, 1 skipped (52.7s)" and "36 passed, 1 skipped (52.8s)". The skip is the known double-click issue in `comparison.spec.js` | ✓ |
| 8 | A deliberate break | A failure is reported | A copy expecting `['linear']` after checking `Logaritmisk` failed; the copy was removed | ✓ |
| 9 | Real data untouched; deploy | `shasum -c` OK; `./deploy.sh -n` lists nothing from `e2e/` | All OK; 0 test files listed | ✓ |
| 10 | PHP unit tests and `openspec validate add-playwright-scale-tests --strict` | Pass | "Alla 171 kontroller lyckades."; valid | ✓ |

### Not verified

- **Exact measure values and tick spacing.** These are out of scope.
- **The scale modes at phone width.**
