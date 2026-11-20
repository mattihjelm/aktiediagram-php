## Verification

Results of the checks in tasks.md for `add-transaction-delete`, run on 2026-11-18.

### Environment

- **Playwright:** the suite in Chromium against the per-run fixture on `127.0.0.1:8766`.
- **Manual check:**
  - local `php -S 127.0.0.1:8765 -t public` on a copy of the local `aktier.csv`, `aktiekop.csv` and `aktievy.json`
  - one test row added to the copy only, to reproduce the server's duplicate: an import-style `UTDELNING` row with quantity 1, the total amount and the transaction ID `TESTID-1`, a few days before the manual row for the same dividend
  - Chrome, driven through the browser automation tools

### Results

| # | Check | Expected | Observed | Result |
|---|-------|----------|----------|--------|
| 1 | Unit tests | Keys differ for identical rows; the middle of three identical rows removed; a stale key for a differing row rejected with the file unchanged; a bad hash rejected; a malformed key rejected; a new row's key works; an older header upgraded | "Alla 181 kontroller lyckades." (9 new). The first version of the stale-key test used identical rows and failed. Identical rows are interchangeable by design, so the test now uses a differing row, and design.md records this | ✓ after fix |
| 2 | Keys for new rows | Rows from the form and the import can be removed without a reload | `Purchases::append` returns `row_key`. A Playwright test registers and then removes a Beta purchase | ✓ |
| 3 | Playwright: identical dividends | One of two removed, the other stays; `Resultat` and the CSV update; then the second can also be removed (shifted keys) | Passing | ✓ |
| 4 | Playwright: `Avbryt` | The row is kept | Passing | ✓ |
| 5 | Playwright: file changed on disk | The error `Transaktionen har ändrats eller tagits bort. Ladda om sidan.`; the file unchanged | Passing | ✓ |
| 6 | Playwright: during solo | The minute-chart marker at `<date> 10:15` disappears | Passing | ✓ |
| 7 | Full suite twice | All pass | "47 passed (1.2m)" twice | ✓ |
| 8 | Manual: duplicated dividend | Before: two equal dividends, so `Utdelning` is twice the dividend, and `Tot avkastn` and the list total include it twice. After `Ta bort` → `Bekräfta` on the manual row: status `Transaktionen <datum> <värdepapper> togs bort ur aktiekop.csv.` | After: only the imported dividend is left; `Utdelning`, `Tot avkastn` and the list total drop by one dividend; a reload shows the same | ✓ |
| 9 | Manual: file content | Only that row removed | `diff` of the copy against the original (without the manual row and the test row) shows only the header, which gained the `time` column as every write does | ✓ |
| 10 | Console | No errors | No errors | ✓ |
| 11 | Real data untouched | `shasum -c` OK | All OK | ✓ |
| 12 | `openspec validate add-transaction-delete --strict` | Valid | Valid | ✓ |

### Fix after the first upload

- **The fault on the web host:** clicking `Bekräfta` showed `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`, and no row was removed. The request was an HTTP `DELETE`. One.com answered it with an HTML page before PHP ran. PHP's local server allows `DELETE`, so the local checks above did not catch this.
- **The fix:** deletion is now `POST {action: "delete", key}` to `api/purchases.php`, like every other write in the app. A non-JSON answer now gives `Transaktionen kunde inte tas bort (servern svarade <status>).`
- **The new guard:** the identical-dividend Playwright test records the HTTP methods sent to `api/purchases.php` and expects only `POST`.
- **After the fix:** "Alla 181 kontroller lyckades.", "47 passed (1.2m)" and `openspec validate add-transaction-delete --strict` valid.

### Hosted check

- **2026-11-18, the hosted app:** after uploading the POST fix with `./deploy.sh`, the user removed the duplicated manual dividend row with `Ta bort` → `Bekräfta` and reported "det gick bra". The dividend from the import stays.

### Phone width (after archiving)

- **Check:** a Playwright test at 390 × 844 with touch taps `Ta bort`, then `Bekräfta`, on a row.
- **Found:** `Ta bort` can be reached, but the wider `Bekräfta` + `Avbryt` cell pushed `Avbryt` outside the table's visible part.
- **Fixed:** `panel.js` scrolls the cell into view when the confirmation appears. The test now passes without scrolling itself.
- **After the fix:** "Alla 181 kontroller lyckades." and "48 passed (1.2m)".
