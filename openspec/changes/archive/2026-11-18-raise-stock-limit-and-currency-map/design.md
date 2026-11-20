## Context

See proposal.md for the motivation and specs/aktiediagram/spec.md for the behavior.

- **Limit:** `MAX_STOCKS = 50` in `private/src/bootstrap.php`. `Stocks.php:51` throws if `aktier.csv` has more rows.
- **Display currency:** `Stocks::currency($ticker)` returns `kr` for `.ST` and `BRK-B`, `USD` for `NDAQ`/`SIRI`/`RIVN`, `EUR` for `RHM.DE`, and `''` otherwise. It is used in `Chart.php` (markers) and `api/purchases.php`.
- **FX currency:** `Stocks::fxCurrency($ticker)` returns `SEK` for `BRK-B` (its amounts are stored in SEK), `USD` for `US_MARKET_TICKERS`, `EUR` for `RHM.DE` and `SEK` otherwise. It is used by `Market::requiredFx`, `Fx::forTicker`, `Chart.php` and `api/current-prices.php`.
- **Browser:** `panel.js:232`, `panel.js:393` and `chart.js:386` repeat the display-currency rule.
- **US market:** `US_MARKET_TICKERS = ['BRK-B','NDAQ','SIRI','RIVN']`. It is used in `Market::latestClosedDate` for the New York close, in `Stocks::fxCurrency` and in `current-prices.php`.
- **Import mapping:** `private/import-mapping.php` `ticker_currency` already lists `BRK-B => SEK`, `NDAQ/SIRI/RIVN/TSLA/0P0000JSS5 => USD` and `RHM.DE => EUR`. Today only the importer reads it.

## Goals / Non-Goals

**Goals:**
- Up to 100 stocks.
- One place that decides each ticker's currency, read by the server and the browser.
- Tesla and the Vontobel USD fund valued correctly.

**Non-Goals:**
- No currencies other than SEK, USD and EUR. `FX_TICKERS` is unchanged, and a ticker in another currency still has no conversion.
- No currency read from Yahoo's metadata.
- No more plot colors. The 10 colors already repeat.

## Decisions

### Read currency from `ticker_currency`
- **New helper** `Stocks::currencyCode($ticker)`: `ticker_currency[$ticker] ?? (str_ends_with($ticker, '.ST') ? 'SEK' : '')`. The mapping file is loaded once per request through a small cached `import_mapping()` function in `bootstrap.php`, which `api/import.php` also uses.
- **`fxCurrency`:** `currencyCode ?: 'SEK'`, which keeps today's fallback. `BRK-B` stays `SEK` through its mapping entry.
- **`currency` (display):** `SEK` → `kr`, otherwise the code (`USD`, `EUR` or `''`).
- *Alternative:* a new constant in `bootstrap.php`. It was rejected because the mapping already holds the same table and a new fund is added there anyway.

### US market by rule
- **New function** `Market::isUsMarket($ticker)`: true when the ticker has no `.` suffix and does not start with `0P`. `BRK-B`, `NDAQ`, `SIRI`, `RIVN` and `TSLA` are true. `.ST`, `RHM.DE`, `0P0000JSS5` and FX symbols (`USDSEK=X`) are false. `=X` contains no dot, so FX symbols are excluded explicitly.
- **`US_MARKET_TICKERS` is removed.**
  - `latestClosedDate` uses `isUsMarket`.
  - `current-prices.php` uses `fxCurrency($ticker) === 'USD' && $ticker !== 'BRK-B'` for the current USD rate, so that the USD fund also gets the current rate.
  - The `RHM.DE` branch becomes `fxCurrency === 'EUR'`.

### Browser gets the currencies from the figure
- **`Chart.php`** adds `meta.currencies` with ticker → display currency (`kr`, `USD`, `EUR` or `''`) for every stock.
- **`panel.js`/`chart.js`:** a shared `window.stockCurrency(ticker)` reads `graph.layout.meta.currencies[ticker] ?? ''`. It replaces the three copies.

### Limit 100
- `MAX_STOCKS = 100`. The `Chart.php` comment changes from 50 to 100.
- The chart is written trace by trace, so memory per stock is small. The first page load after adding the rows fetches the missing histories in parallel with `yahoo_concurrency`, and later loads read the cache.

### Adding the rows
- After the code change, the new rows from the list in the conversation are appended to the local `private/data/aktier.csv`, with `show_initially=false`.
- The file keeps its format: `ticker,name,show_initially`, comma-separated. Existing rows are not changed.
- The user uploads it to the server, because `deploy.sh` does not upload data.

## Risks / Trade-offs

- [The first load after adding the new stocks is slow, or Yahoo rate-limits it] → Histories that fail are retried on later loads, as today. The page still shows the stocks that loaded.
- [A foreign ticker missing from `ticker_currency` is treated as SEK] → This is the same as today. The spec makes `ticker_currency` the place to add it.
- [The rule misclassifies a future non-US ticker without a suffix] → All current tickers are covered. A new one can get a suffix, or the rule can be extended.
