## 1. Tabeller och hovring

- [x] 1.1 In `public/assets/panel.js`, rename the `Resultat` headings (`Kurs`, `Avkastn`, `Tot avkastn`, `Tot avkastn (%)`) and the `Transaktioner` headings (`Kurs`, `Avgår`, `Värde`), add the `Tid` column after `Datum` with date-only `Datum`, and shift the `number` class index; in `public/assets/app.css`, reduce the transaction-list padding and let headings wrap; verify in the browser on a copy of the data that the headings, values, alignment, sorting on `Aktie` and hiding dividends are correct, use content-sized `Resultat` with `Transaktioner` taking the rest (`#transaction-tables` grid `max-content minmax(0, 1fr)`, `Resultat` table `width: max-content; table-layout: auto`); and compare both tables' widths before (`Resultat` 1398 px with 136 px columns, `Transaktioner` 802 px in a ~707 px column) and after
- [x] 1.2 In `public/assets/intraday.js`, put the time first in the hover text for purchases and sales with a time; verify in the browser with a test purchase with a time and one without

## 2. Kontroll

- [x] 2.1 Manual check in the running app on a copy of the data, including the narrow layout (≤ 900 px) of both tables; write `verification.md`; confirm that `private/data` is untouched; then `php private/tests/run.php` and `openspec validate compact-transaction-tables --strict` pass
