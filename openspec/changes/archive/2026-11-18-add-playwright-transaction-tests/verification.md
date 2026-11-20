## Verification

Results of the checks in tasks.md for `add-playwright-transaction-tests`, run on 2026-11-18. The run came after `widen-legend-and-total-kkr`, so the tests use the new legend label with `kkr` last.

### Environment

- **Tools:** Node.js v24.19.0, `@playwright/test` 1.65.1, Playwright Chromium.
- **Server:** PHP server `php -S 127.0.0.1:8766 -t public`.
- **Fixture:** per-run, from `e2e/fixture.js`. `resetState()` now also restores `aktiekop.csv` from `aktiekop-base.csv` (four `ALFA.ST` rows) before every test.

### Results

| # | Check | Expected | Observed | Result |
|---|-------|----------|----------|--------|
| 1 | First run of `transactions.spec.js` | All pass | 6 passed, 1 failed: the browser logged the expected HTTP 400 responses for the invalid entries as resource errors. The test now filters only `status of 400` lines | ✓ after fix |
| 2 | `transactions.spec.js` | 7 pass | 7 passed (11.4 s) | ✓ |
| 3 | Suggestions | Price = the fixture close; commission 0,25 %; total text | Matched the values computed from the fixture cache | ✓ |
| 4 | Purchase with time | Status, CSV row, `Tid` and `Datum`, `Resultat` `Antal` 10, legend `… · <n> kkr`, chart marker, cleared form | All asserted and passing | ✓ |
| 5 | Sale | `Antal` 14 → 10; `SÄLJ` row; `Nettobelopp` | Passing | ✓ |
| 6 | Dividend | Relabelled fields; `Tid` hidden; `Utdelning efter källskatt: 35,00 kr`; `UTDELNING` row; `Utdelning` cell changes | Passing | ✓ |
| 7 | Validation | `Antalet måste vara större än noll.` and `Det finns ingen kursdata före köpdatumet.`; still 4 rows | Passing | ✓ |
| 8 | Reload | The transaction stays; `Antal` 7 | Passing | ✓ |
| 9 | During solo | A marker at `<date> 11:00` in the minute chart | Passing | ✓ |
| 10 | Full suite twice | All pass | "23 passed (31.2s)" and "23 passed (31.3s)" | ✓ |
| 11 | A deliberate break | A failure is reported | A copy expecting `Antal` 99 failed with Expected 99, Received 14; the copy was removed | ✓ |
| 12 | Real data untouched | `shasum -c` OK | All OK | ✓ |
| 13 | Deploy | `./deploy.sh -n` lists nothing from `e2e/` or the Node files | 0 matching lines | ✓ |
| 14 | Temp cleanup | No `aktier-e2e-*` left | None | ✓ |
| 15 | PHP unit tests and `openspec validate add-playwright-transaction-tests --strict` | Pass | "Alla 171 kontroller lyckades."; valid | ✓ |

### Not verified

- **Foreign-currency transactions**, such as USD prices and commission conversion, and **broker import.** Both are out of scope.
- **Editing or deleting transactions.** The app has no such controls.
