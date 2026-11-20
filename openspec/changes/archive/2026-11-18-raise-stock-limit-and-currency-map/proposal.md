## Why

The user wants to add a batch of newly mapped securities (mostly funds, a few stocks) to `aktier.csv`, which would then have more than 50 rows. The app rejects more than 50 rows (`MAX_STOCKS`), so the list would stop loading.

Two of the new securities are traded in USD: Tesla (`TSLA`) and Vontobel Commodity B USD (`0P0000JSS5`). The currency of each ticker is hard-coded in five places (`Stocks::currency`, `Stocks::fxCurrency`, two copies in `panel.js` and one in `chart.js`) as `NDAQ`/`SIRI`/`RIVN` → USD and `RHM.DE` → EUR. Every other ticker is treated as SEK. Tesla and the Vontobel fund would therefore be valued in SEK without conversion, and `Resultat` would be wrong. `US_MARKET_TICKERS` also lacks `TSLA`, so Tesla's daily close would be taken at the Stockholm time instead of after the New York close.

## What Changes

- Raise the stock limit from 50 to 100.
- Make the import mapping's `ticker_currency` the single source for which ticker is in which currency. The server and the browser both read it, so a new foreign ticker needs one line in `private/import-mapping.php` instead of five code edits.
- Treat a ticker without an exchange suffix that is not a fund id (`0P…`) as listed in the US for closing times. This covers `TSLA` and keeps today's tickers unchanged.
- Add the new rows to the local `private/data/aktier.csv` after the code change, at the user's request. `deploy.sh` never uploads data, so the user uploads the file to the server.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `aktiediagram`: The requirement "Konfigurerbar aktielista" raises the limit to 100 and states where each stock's currency and market come from. Its scenario "Ogiltig eller för stor konfiguration" changes from 50 to 100.

## Impact

- **Server:**
  - `private/src/bootstrap.php`: `MAX_STOCKS`, and `US_MARKET_TICKERS` replaced by a rule.
  - `private/src/Stocks.php`: `currency` and `fxCurrency`.
  - `private/src/Market.php`: `latestClosedDate`.
  - `public/api/current-prices.php`
  - `private/src/Chart.php`: currencies in the figure meta.
- **Browser:** `public/assets/panel.js` (two places) and `public/assets/chart.js` (one place) read the currency from the figure instead of a hard-coded list.
- **Configuration:** `private/import-mapping.php` is already uploaded by `deploy.sh`.
- **Data:** the local `private/data/aktier.csv` gets the new rows (more than 50 in total). The `aktiekop.csv` format is unchanged.
- **Load:** the first page load after the rows are added fetches the new histories from Yahoo. After that they are cached.
