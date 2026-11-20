## 1. Beräkning

- [x] 1.1 In `public/assets/panel.js`, extract the per-stock calculation in `renderPortfolioSummary` into a reusable function that also returns `dividendLocal` (net × `sek_fx_rate` / `ticker_fx_rate`, null if a rate is missing), expose it as `window.getHolding(ticker)`, and call `window.updateIntradayBreakeven` at the end of the summary; verify that the portfolio table shows identical values before and after on the copied data
- [x] 1.2 In `public/api/intraday.php`, add `sekRate` (latest rate for the minute chart's currency, omitted for SEK and unknown currencies) and add a test in `private/tests/run.php` if the logic is put in a testable function; verify with `php private/tests/run.php` and a request for BRK-B that returns USD with a plausible `sekRate`

## 2. Linje i minutdiagrammet

- [x] 2.1 In `public/assets/intraday.js`, compute the break-even from `window.getHolding` with the kr → USD conversion, and draw the dashed line and the `Nollpunkt <pris> <valuta>` label; combine shapes with the pinned point's line so that pin/unpin keep the break-even; verify in the browser for a SEK stock, a USD stock with SEK dividends (SIRI or NDAQ), BRK-B, and a stock without holdings
- [x] 2.2 Place the label at the top or bottom edge with `▲`/`▼` when the line is outside the y-range, re-evaluated after `Vecka`/`Månad`, zoom and pan, and implement `window.updateIntradayBreakeven`; verify in the browser by zooming so that the line leaves the range, and by registering a test purchase on the copied data while solo

## 3. Kontroll

- [x] 3.1 Manual check in the running app on a copy of the data: the line value matches GAV − dividend/antal computed from the portfolio table, the pinned point still works and its close keeps the line, solo switch/off, and the real data files are unchanged; then `php private/tests/run.php` and `openspec validate add-intraday-breakeven-line --strict` pass
