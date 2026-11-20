## 1. Server

- [x] 1.1 In `private/src/bootstrap.php`, set `MAX_STOCKS` to 100, remove `US_MARKET_TICKERS` and add a cached `import_mapping()`; use it in `public/api/import.php`; update the `Chart.php` comment
- [x] 1.2 In `private/src/Stocks.php`, add `currencyCode()` from `ticker_currency`, and base `currency()` and `fxCurrency()` on it
- [x] 1.3 In `private/src/Market.php`, add `isUsMarket()` and use it in `latestClosedDate()`; in `public/api/current-prices.php`, choose the current USD/EUR rate by `fxCurrency()`
- [x] 1.4 In `private/src/Chart.php`, add `meta.currencies`
- [x] 1.5 Tests in `private/tests/run.php`:
  - `currency`/`fxCurrency` for `.ST`, `BRK-B`, `NDAQ`, `TSLA`, `0P0000JSS5`, `RHM.DE` and an unknown ticker
  - `isUsMarket` for the same tickers and `USDSEK=X`
  - 100 stocks accepted, 101 rejected
  - verify with `php private/tests/run.php`

## 2. Webbläsare

- [x] 2.1 Add `window.stockCurrency(ticker)` from `meta.currencies`, and replace the hard-coded lists in `public/assets/panel.js` (two places) and `public/assets/chart.js` (one place)

## 3. Data

- [x] 3.1 Append the new rows to the local `private/data/aktier.csv` without changing existing rows, only after the code passes its checks

## 4. Kontroll

- [x] 4.1 Manual check in the running app on a copy of the data with the new rows:
  - the page loads without a limit error
  - a test `TSLA` purchase shows `USD` in the form total, the transaction list and `Resultat`, and its SEK value is converted with USD/SEK
  - NDAQ, BRK-B and RHM.DE show the same values as before the change
  - a fund shows `kr`
  - no console errors
- [x] 4.2 Write `verification.md`; check that the real data is untouched until step 3.1, and that 3.1 changed only `aktier.csv`; `php private/tests/run.php` and `openspec validate raise-stock-limit-and-currency-map --strict` pass
