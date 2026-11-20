## 1. Gemensam beräkning

- [x] 1.1 Add `window.getBreakeven(ticker)` in `public/assets/panel.js` (value and currency from `holdingFrom`, null without holdings or with a missing dividend rate), switch `computeBreakeven` in `public/assets/intraday.js` to use it with the existing kr → USD conversion, and call `window.refreshStockChartOverlays` from `renderPortfolioSummary`; verify in the browser that the minute chart shows the same break-even values as before (for a SEK stock, SIRI and BRK-B)

## 2. Linje i huvuddiagrammet

- [x] 2.1 In `public/assets/chart.js`, add the break-even shape and label for the solo stock in `comparisonOverlays` (index = value / visible base × 100, own axis on log scale, edge label with `▲`/`▼` outside the target y-range), expose `window.refreshStockChartOverlays`, and refresh the view on solo on/off; verify in the browser on a copy of the data that the line is at the expected index for a solo stock, moves when the date range changes, works with the log scale, and disappears when solo is turned off

## 3. Kontroll

- [x] 3.1 Manual check in the running app on a copy of the data: no line without solo or without holdings, the line moves after a test purchase while solo, comparisons and endpoint labels still work with the line shown, and the minute chart is unchanged; confirm that `private/data` is untouched; then `php private/tests/run.php` and `openspec validate add-main-chart-breakeven-line --strict` pass
