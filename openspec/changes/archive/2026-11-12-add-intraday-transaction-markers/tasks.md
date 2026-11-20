## 1. Transaktioner för aktien

- [x] 1.1 Add `window.getTransactions(ticker)` in `public/assets/panel.js` returning the solo stock's events from the main chart's `purchase` trace (date, type, price, quantity, commission, currency, rates, chart price), and call `window.refreshIntradayOverlays` (renamed from `updateIntradayBreakeven`) from `renderPortfolioSummary`; verify in the browser console that it returns the same events as the transaction list for a SEK stock and SIRI

## 2. Markeringar i minutdiagrammet

- [x] 2.1 In `public/assets/intraday.js`, add the marker trace (symbols, stock colour, outline), placement at the day's first minute, purchase/sale price converted to the minute chart's currency (including the BRK-B kr → USD day ratio), dividends on the curve, Swedish hover text, purchase/sale prices included in `fitY`, and `window.refreshIntradayOverlays` updating markers and the break-even line; verify in the browser on a copy of the data with a stock that has events in the last 30 days (or a test purchase in the copy), including a SEK stock, a USD stock and BRK-B

## 3. Kontroll

- [x] 3.1 Manual check in the running app on a copy of the data: markers at the expected minute and price, hover text, a test purchase while solo appears without refetching, events older than 30 days are absent, the pinned point, the break-even line and Vecka/Månad still work; write `verification.md`; confirm that `private/data` is untouched; then `php private/tests/run.php` and `openspec validate add-intraday-transaction-markers --strict` pass
