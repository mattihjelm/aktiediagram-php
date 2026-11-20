## Verification

Results of the checks in tasks.md for `add-account-per-transaction`, run on 2026-11-19.

### Environment

- **Unit tests:** `php private/tests/run.php`.
- **Playwright:** the suite in Chromium against the per-run fixture on `127.0.0.1:8766`.
- **Manual check:**
  - local `php -S 127.0.0.1:8765 -t public` with `AKTIER_CONFIG` pointing at a scratch copy of the real `aktier.csv`, `aktiekop.csv`, `aktievy.json` and price cache
  - driven by headless Chromium scripts
  - the real `private/data` was checked with `shasum -c` before and after

### Results

| # | Check | Expected | Observed | Result |
|---|-------|----------|----------|--------|
| 1 | Unit tests | Rows without an account read as `T` and get the column on write; `account()` accepts `i` → `I` and rejects `''`, `TT`, `1` and `Å`; an import on another account is all new and on the same account all duplicates; row keys work across the header upgrade; series per account, display names, customdata 12, `lastSolo` with exact key, bare ticker and unknown value, `series_visible` | "Alla 204 kontroller lyckades." (23 new) | ✓ |
| 2 | First unit run | — | A new row's key was computed before the `T` default was applied, so it did not match the row read back. `append` now always writes the account | ✓ after fix |
| 3 | Playwright, existing tests | Pass with names such as `Alfa Test (T)` and series keys | Expectations updated. The first Beta purchase now reloads the page, so one test checks the reloaded form, and a new test checks the in-place path that clears the form | ✓ |
| 4 | Playwright, `accounts.spec.js` | Two series with separate results; solo per account (lists and minute markers); hidden series survives a reload without touching `aktier.csv`; a new account reloads with the status; an invalid account is refused; a curve click fills `Konto`; a delete on one account leaves the other; the import needs an account and checks duplicates per account, also on the server | 8 passed | ✓ |
| 5 | Full suite | All pass | "57 passed (1.5m)" | ✓ |
| 6 | Missing file in the plan | Solo saves `last_solo` | `api/view-range.php` returned 400 for `ALFA.ST\|T`. It now accepts a series key; design.md updated | ✓ after fix |
| 7 | Manual: real data copy | All existing transactions show as `(T)` | Every security with transactions shows `(T)`, and the securities without transactions have no parentheses. The marker count matches the rows in `aktiekop.csv` and in `Transaktioner`. `Resultat` has one row per security with transactions, and a fully sold holding's total is the same as before the change | ✓ |
| 8 | Manual: new account | Registering a test purchase of a held security on `I` in the copy reloads and splits | The status names the security with `(I)`. One more series than before. The security on two accounts splits into two rows with separate holdings: the `(I)` row holds only the test purchase, and the `(T)` row is unchanged. The file header got `time;account`, with `T` on old rows. The suggestions are `I` and `T` | ✓ |
| 9 | Manual: solo on the `(I)` series | Title, lists and Resultat for the account only | The minute-chart title ends in `(I) – minutkurser`; the list and Resultat hold only the `(I)` series | ✓ |
| 10 | Manual: phone width | No sideways scroll; `Konto` readable | `scrollWidth` 390. The `Konto` field was only about 2 px wide inside at 13 px text, because Chrome reserves room for the datalist arrow. It now has a minimum width and less padding, and `T` shows | ✓ after fix |
| 11 | Console | No errors | No errors in any manual run | ✓ |
| 12 | Real data untouched | `shasum -c` OK | All OK | ✓ |
| 13 | `openspec validate add-account-per-transaction --strict` | Valid | Valid | ✓ |
| 14 | Hosted: import of a security on `I` | `Resultat` holds the net quantity of the four rows | All four `I` rows are in the file and the list, but `Resultat` showed too many shares. The export lists newest first, so a same-day sale came before a buy; `holdingFrom` sorted by date only and capped the sale at the quantity held before the buy. Not new in this change, but first hit by this import. Same-day events now sort by time when both have one, otherwise buys before sales. New Playwright test fails with "Received: 8" without the fix | ✓ after fix |
| 15 | Full suite after the fix | All pass | "Alla 204 kontroller lyckades.", "58 passed (1.5m)"; real data `shasum -c` OK | ✓ |
| 16 | Hosted after `./deploy.sh` with the fix | The app works on the web host | The user confirmed: "det är uppladdat och fungerar" | ✓ |

### Notes

- **No pre-change baseline:** the code from before the change is not kept locally, so the Resultat figures could not be compared side by side with the old version. Every ticker gets exactly the same transactions as before, now on `T`. The marker and row counts match `aktiekop.csv`, and a fully sold holding's total equals the value noted before this change.
- **Not caused by this change:** at 1400 px with the real data, the wide `Resultat` table squeezes the `Transaktioner` column, and the file chooser sticks out 39 px. Removing the new `Konto` field gives the same widths.
- **Two accounts of one security** have identical index curves, which overlap in the main chart. That follows from the design: the same price, a separate holding.

### Not verified

- Nothing. The real broker export on `I` was imported on the hosted app (row 14).