## 1. Webbläsare

- [x] 1.1 In `public/assets/chart.js`, add `dropHiddenComparisons()` and call it after the restyle in `applyVisibility` and in `toggleTicker`'s non-solo path; redraw the overlays only when something was removed
- [x] 1.2 In `public/assets/chart.js`, clear comparisons on `plotly_doubleclick` instead of the native `dblclick`, which never fires; ignore a double-click within 600 ms of a click that picked a curve point

## 2. Tester

- [x] 2.1 Add `clickCurvePoint(page, ticker, date)` to `e2e/helpers.js`
- [x] 2.2 `e2e/comparison.spec.js`:
  - two clicks create a label
  - hiding the stock in the legend removes it, keeps another stock's label, and it stays removed when shown again
  - solo on another stock removes it, and it stays removed after unchecking solo
  - solo on the same stock keeps it
  - a started comparison is cleared when its stock is hidden
  - a double-click outside the curves clears everything, and a double-click on a curve does not
- [x] 2.3 README: mention the comparison tests

## 3. Kontroll

- [x] 3.1 Manual check in the running app on a copy of the data:
  - create a comparison, hide the stock, and select solo for another stock; the label is removed in both cases
  - solo on the same stock keeps it
  - the double-click clear works
  - no console errors
- [x] 3.2 Run `npm run test:e2e` twice; all tests pass. Break one assertion on purpose and restore it. `private/data` is untouched. Write `verification.md`; `php private/tests/run.php` and `openspec validate clear-comparison-when-stock-hidden --strict` pass
