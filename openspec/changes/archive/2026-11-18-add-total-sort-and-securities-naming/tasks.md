## 1. Server

- [x] 1.1 Add `'total'` to `Chart::LEGEND_SORTS`; unit test that `total` is saved and read back; `php private/tests/run.php` passes

## 2. Webbläsare

- [x] 2.1 In `public/assets/chart.js`:
  - store `meta.totalSek` in `refreshProfitLabel`
  - add the `Total` sort to `LEGEND_SORTS` and `legendEntries()`
  - change the heading to `Värdepapper / resultat` and the sort group label to `Sortera värdepapperslistan`
- [x] 2.2 In `public/assets/panel.js`:
  - the list's `aria-label` becomes `Värdepapperslistan`
  - `Värdepapper` in the `Resultat` and `Transaktioner` headings, including the sort label and its `aria-label`

## 3. Tester

- [x] 3.1 Update `e2e/smoke.spec.js` to expect four sort buttons, and add a test of the `Total` order and the new headings; `npm run test:e2e` passes

## 4. Kontroll

- [x] 4.1 Manual check on a copy of the data:
  - the `Total` order matches `Tot avkastn` in `Resultat`, including USD and EUR stocks
  - a reload keeps `Total`
  - the new headings appear
  - no console errors
- [x] 4.2 Write `verification.md`; confirm that `private/data` is untouched; `openspec validate add-total-sort-and-securities-naming --strict` passes
