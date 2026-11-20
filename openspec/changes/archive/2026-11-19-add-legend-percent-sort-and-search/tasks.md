## 1. `Total %` sort

- [x] 1.1 Add `'total_percent'` to `Chart::LEGEND_SORTS` in `private/src/Chart.php`, and add unit tests in `private/tests/run.php` showing that `legend_sort` `total_percent` is saved and read back. Verify with `php private/tests/run.php`.
- [x] 1.2 In `public/assets/panel.js`, move the `Tot avkastn (%)` computation into a shared helper used by `renderPortfolioSummary`, and expose `window.totalReturnPercent(series)`. Verify that the `Resultat` percentages are unchanged in the existing Playwright tests.
- [x] 1.3 In `public/assets/chart.js`, add `['total_percent', 'Total %']` to `LEGEND_SORTS` and sort by `window.totalReturnPercent` in `legendEntries()`: highest first, null last, stable. Verify with a Playwright test that the order matches the `Tot avkastn (%)` column, the button is pressed, `aktievy.json` holds `total_percent`, and the order survives a reload.

## 2. Darker text

- [x] 2.1 In `public/assets/app.css`, set `.stock-legend-name` to `#1b2432` and `.stock-legend-profit` to `#1e2631`. Verify with a Playwright check of the computed colours (`rgb(27, 36, 50)` and `rgb(30, 38, 49)`) and that hidden rows keep their reduced opacity.

## 3. Search field

- [x] 3.1 In `chart.js`, have `renderCustomLegend()` build the header once and on later calls refresh only the sort buttons' `aria-pressed` and the rows. Verify that the existing legend, sort, solo and visibility tests still pass.
- [x] 3.2 Add the search field `Sök värdepapper` last in the header. Filter rows by a case-insensitive substring of `displayName`, and show `Inga värdepapper matchar sökningen.` when nothing matches. Style it in `app.css` for desktop and phone. Verify with Playwright that:
  - typing a part of a name shows only matching rows
  - `(i)` filters to account `I`
  - the field keeps focus and value across a re-render triggered by a toggle or sort while it holds text
  - no match shows the message
  - curves, solo, `Transaktioner` and `Resultat` are unaffected
  - a reload starts empty
  - phone width has no sideways scroll

## 4. Verification

- [x] 4.1 Run the full unit and Playwright suites, and update the existing expectations that list four sort buttons. All must pass.
- [x] 4.2 Manual check in the running app on a scratch copy of the real data, with the real `private/data` checked by `shasum -c` before and after:
  - `Total %` ranks as the `Resultat` column
  - the colours look darker
  - searching `glob` and `(t)` works on desktop and phone width
  - no console errors

  Record the results in `verification.md`.
- [x] 4.3 Run `openspec validate add-legend-percent-sort-and-search --strict` and confirm it is valid.
