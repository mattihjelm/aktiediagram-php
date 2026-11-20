## 1. Beside `Resultat` when it fits

- [x] 1.1 Remove the first version from `panel.js` and `app.css`: the 2000 px `matchMedia` move into `#stock-chart-viewport`, and the `@media (min-width: 2000px)` rules. Verify with grep that neither remains.
- [x] 1.2 In `public/assets/panel.js`, add `placeTransactionList()`, which measures both tables at full width and toggles `side-by-side` on `#transaction-tables`. Call it after both tables render and on resize. Verify with Playwright at 2600 px that `Transaktioner` is right of `Resultat` with the headings on one row, and at 1400 px that it is under `Resultat`.
- [x] 1.3 In `public/assets/app.css`, add the two-column grid for `#transaction-tables.side-by-side`. Have `syncTransactionListHeight` use max(height of the `Resultat` table, ten rows) side by side. Verify with Playwright that the list is as tall as `Resultat` when that is taller, at least ten rows when `Resultat` is short (solo), scrolls with the header on top, and the page has no sideways scroll.
- [x] 1.4 Verify with Playwright that resizing from 2600 px to 1400 px and back switches the layout without a reload and keeps an open import preview and its buttons working.

## 2. Verification

- [x] 2.1 Run the full unit and Playwright suites. All must pass.
- [x] 2.2 Manual check on a scratch copy of the real data, with the real `private/data` checked by `shasum -c` before and after:
  - find the width where the layout switches
  - check positions and heights just above and below that width, at 1400 px, and with solo on
  - no sideways scroll
  - no console errors

  Record the results in `verification.md`, replacing the first version's results.
- [x] 2.3 Run `openspec validate add-wide-transactions-column --strict` and confirm it is valid.
