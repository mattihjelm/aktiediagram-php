## 1. Minutdata på servern

- [x] 1.1 Add pure functions in `Market` that split the last 30 days into 1-minute windows of at most 7 days and merge chart responses by timestamp (dropping duplicates and null closes); verify with new tests in `private/tests/run.php` (window count/bounds, overlap dedup, null drop, Stockholm time formatting) and `php private/tests/run.php` passing
- [x] 1.2 Add `Market::fetchMinutes($symbol)` using `fetchAll()`, partial-failure warnings and a 5-minute cache in `data/cache/minutes-<symbol>.json`; verify against the live Yahoo API from a scratchpad script that a Stockholm stock returns ~30 days of 1-minute points and a second call within 5 minutes is served from cache
- [x] 1.3 Add `public/api/intraday.php` (`POST {ticker}`, login + CSRF via `run_api`, 400 for tickers not in `aktier.csv`, JSON with ticker, name, currency, times, close, warnings); verify with tests for the unknown-ticker rejection and a manual request on the local test server

## 2. Minutdiagram i webbläsaren

- [x] 2.1 Add `#intraday-panel` (heading, `Vecka`/`Månad` buttons, status, plot div) to `public/index.php` and styles in `public/assets/app.css`; verify the hidden panel does not change the page layout when solo is off
- [x] 2.2 Add `public/assets/intraday.js` with `showIntraday`/`hideIntraday`: loading status, error message in the panel, discarding stale responses, `scatter` price trace (SVG, since rangebreaks do not work with `scattergl`) with currency in axis title and hover, gap-based `rangebreaks`, `Vecka`/`Månad` ranges with y fitted to the visible points (also after mouse zoom); verify in the browser on the local test server
- [x] 2.3 Call `showIntraday`/`hideIntraday` from `setSolo()` in `public/assets/chart.js` (solo on, solo moved, solo off) and load `intraday.js` in `index.php`; verify that solo on/off/switch shows, updates and hides the minute chart while the main chart, log scale and saved view are unchanged

## 3. Kontroll

- [x] 3.1 Manual check in the running app on a copy of the data: solo on a Stockholm stock, on a US stock (USD, US hours in Swedish time) and on RHM.DE; `Vecka`/`Månad`; nights and weekends hidden; error message with Yahoo blocked; narrow layout; the user's real `aktier.csv`, `aktiekop.csv` and `aktievy.json` unchanged
- [x] 3.2 Update the upload list in README if needed, and run `openspec validate add-intraday-solo-view --strict` and `php private/tests/run.php`; both pass
