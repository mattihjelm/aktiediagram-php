## 1. Server

- [x] 1.1 In `private/src/Purchases.php`, add `rowKey()` and `remove($key)` under the exclusive lock
- [x] 1.2 In `private/src/Chart.php`, pass the row index to the markers and add `row_key` as customdata index 11
- [x] 1.3 In `public/api/purchases.php`, accept `POST {action: "delete", key}` (200, 400 for a malformed key, 409 for a stale key); `DELETE` was used first and is blocked by one.com
- [x] 1.4 Unit tests in `private/tests/run.php`:
  - removing the middle one of three identical rows leaves two
  - a stale hash or index throws and leaves the file unchanged
  - an older header is upgraded
  - verify with `php private/tests/run.php`

## 2. Webbläsare

- [x] 2.1 In `public/assets/panel.js`:
  - add the `Ta bort` column with the inline `Bekräfta` / `Avbryt`
  - send `POST {action: "delete", key}`
  - remove the point and shift later row keys
  - recalculate the chart, lists, the list's return and the minute chart
  - show the status or the error

## 3. Tester

- [x] 3.1 In `e2e/transactions.spec.js`:
  - deleting one of two identical dividends leaves the other, with `Resultat` and the CSV updated
  - `Avbryt` keeps the row
  - a stale key after the file was changed on disk gives the error and removes nothing
  - deleting during solo removes the minute-chart marker
  - `npm run test:e2e` passes

## 4. Kontroll

- [x] 4.1 Manual check on a copy of the data with a duplicated dividend:
  - remove one
  - `Resultat` and the list update
  - a reload shows the same
  - no console errors
- [x] 4.2 Write `verification.md`; confirm that `private/data` is untouched; `php private/tests/run.php` and `openspec validate add-transaction-delete --strict` pass
