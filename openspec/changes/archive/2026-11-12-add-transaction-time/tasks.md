## 1. Data och server

- [x] 1.1 Add `time` last in `PURCHASE_FIELDS`, require it in `Purchases::withCurrentHeader`, add `Purchases::validTime`, validate an optional `time` in `entryFromForm` (empty for dividends), put the validated time in `Chart` marker `customdata[10]`, and return `time` from `public/api/purchases.php`; add tests in `private/tests/run.php` for the header upgrade keeping all values, keeping hand-entered times when appending, valid/invalid/empty form times, dividends ignoring time, and invalid file values giving an empty `customdata[10]`; verify with `php private/tests/run.php`

## 2. Formulär, lista och minutdiagram

- [x] 2.1 Add the optional `Tid` field (`type="time"`) in `public/index.php`, hide it for dividends, send it on submit, show the time in the transaction list, add it to the new-marker `customdata` and to `getTransactions` in `public/assets/panel.js`; verify in the browser on a copy of the data
- [x] 2.2 In `public/assets/intraday.js`, place purchases and sales with a time at the first minute at or after it (or the day's last minute) and add `kl. HH:MM` to the hover; verify in the browser with test purchases at 10:42, after the close, and without a time, for a SEK stock and BRK-B

## 3. Kontroll

- [x] 3.1 Manual check on a copy of the data: upgrade an `aktiekop.csv` without `time` and compare all rows before/after, hand-enter a time in the copy and confirm it survives a new registration and an import preview, an invalid hand-entered time is ignored, the form rejects `25:10`; write `verification.md`; confirm that `private/data` is untouched; then `php private/tests/run.php` and `openspec validate add-transaction-time --strict` pass
