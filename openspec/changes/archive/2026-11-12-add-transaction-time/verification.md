## Verification

Results of the checks in tasks.md for `add-transaction-time`, run on 2026-11-12.

### Environment

- **Server:** local `php -S 127.0.0.1:8765 -t public` with `AKTIER_CONFIG` pointing to a test config.
- **Data:** a fresh copy of `aktier.csv`, `aktiekop.csv` (no `time` column) and `aktievy.json` in the session's scratch directory. A second copy, `aktiekop-before.csv`, was kept for comparison. Test events and hand edits were made in the test copy only; the real `private/data` was never used.
- **Market data:** live Yahoo Finance minute prices. 2026-11-12 was still trading during the check, with its last minute at 16:15.
- **Browser:** Chrome, driven through the browser automation tools. The form was filled through its own fields and submitted with `requestSubmit`.

### Results

| # | Check | Expected | Observed | Result |
|---|-------|----------|----------|--------|
| 1 | Unit tests | The header upgrade keeps all values; a hand-entered time survives an append; valid, invalid and empty times; dividends ignore a time; the form rejects `25:10` | "Alla 139 kontroller lyckades." (8 new) | ✓ |
| 2 | File upgrade on the first save | `time` is added last in the header, the old rows only gain an empty `time`, and nothing else changes | Header `…;amount_currency;time`. All old rows are identical to before plus a trailing `;`. 3 new rows were appended | ✓ |
| 3 | `Tid` field | Shown for KÖP and SÄLJ, hidden for UTDELNING | Hidden for UTDELNING, shown for KÖP | ✓ |
| 4 | Purchase with a time (a Swedish stock, 2026-11-12 10:42, 600,00 kr) | Saved with `10:42`. Marker at 10:42. Hover with `kl. 10:42`. List `2026-11-12 10:42` | File row `…;;;10:42`. Marker `2026-11-12 10:42` at 600,00. Hover `KÖP 1 st à 600,00 kr · courtage 1,00 kr · kl. 10:42`. List row `2026-11-12 10:42 KÖP` | ✓ |
| 5 | Sale after the last minute (the same stock, 18:05) | The day's last minute with a price | Marker at `2026-11-12 16:15` (the last minute at the time), hover `kl. 18:05` | ✓ |
| 6 | Purchase without a time | The day's first minute, no time in the hover, saved with an empty `time` | Marker `2026-11-12 09:00`, no `kl.`, file row ends `;;;` | ✓ |
| 7 | Hand-entered times in the file | A valid value is used; an invalid one is ignored; both survive the app's next append | `11:30` on a row: marker at `2026-11-12 11:30`. `9.30` on an older row: `getTransactions` time `''`. After a later save both are still in the file unchanged | ✓ |
| 8 | Invalid time through the API | 400 with a clear message, file unchanged | `400`, `Ange tid i formatet TT:MM, till exempel 10:42.` | ✓ |
| 9 | BRK-B purchase with a time (2026-11-11 16:00, 5 200 kr) | At 16:00 (US open 15:30), converted with the day's ratio | Marker `2026-11-11 16:00` at 527,35 USD, the same as the expected 5200 × day close / kr chart price. Hover `· kl. 16:00` | ✓ |
| 10 | Time field after a save | Cleared | `''` after saving a SÄLJ at 13:07, and the list shows `2026-11-12 13:07` | ✓ (after adjustment) |
| 11 | Console | No errors | No errors | ✓ |
| 12 | Real data untouched | `shasum -c` OK | All OK | ✓ |
| 13 | `openspec validate add-transaction-time --strict` | Valid | Valid | ✓ |

### Adjustments

See design.md, "Adjustments during implementation": the time field is cleared after a save, and the new-marker `customdata` now has all 11 indexes.

### Not verified

- **Import preview and confirmation in the browser.** The import writes through the same `Purchases::append`, whose preservation of hand-entered times is covered by unit test 1. Import rows get an empty `time` through `$row[$field] ?? ''`.
- **An invalid hand-entered time in `run.php`.** It needs cached price history to build a `Chart` marker, so it was checked in the browser (row 7).
- **Narrow layout** of the form with the extra field.


### Hosted check

- **2026-11-12:** The user uploaded the change to the web host and confirmed that it works.
