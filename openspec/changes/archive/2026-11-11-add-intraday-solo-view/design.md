## Context

See proposal.md for motivation and specs/aktiediagram/spec.md for the required behavior.

- The page builds the main chart from `api/chart.php` (daily data cached in `data/cache/<symbol>.json` by `Market`). Solo is handled in the browser by `setSolo()` in `public/assets/chart.js` and is exposed as `window.getSoloTicker()`.
- `Market` already talks to the Yahoo chart API (`/v8/finance/chart/{symbol}`) through `fetchAll()`, which runs requests in parallel with `curl_multi` (`yahoo_concurrency`, default 8) and `chartResult()`, which turns a response into the `chart.result[0]` array or an exception.
- Yahoo limits, checked against the live API on 2026-11-11:
  - `interval=1m` only works inside the last 30 days, and at most 8 days per request. `range=1mo&interval=1m` is rejected.
  - `range=7d&interval=1m` works in a single request (about 3 000 points for a Stockholm stock).
  - `interval=2m` would cover a month in one request, but at half the resolution.
- One.com shared hosting: PHP per request, with a request time limit. Each Yahoo request takes well under a second.

## Goals / Non-Goals

**Goals:**
- 1-minute resolution for the whole 30 days, fetched in one API call from the browser.
- No effect on the main chart, the log scale, `aktievy.json`, `aktier.csv` or `aktiekop.csv`.

**Non-Goals:**
- No transaction markers, comparisons, end labels or log scale in the minute chart.
- No automatic live updates while the minute chart is open. A new solo selection, or reloading the page, fetches again (subject to the cache).
- No conversion to SEK. BRK-B is shown in USD in the minute chart, even though the main chart shows it in SEK.
- No minute data older than 30 days. Yahoo does not provide it.

## Decisions

### Fetch 1-minute data in parallel 7-day windows
`Market::fetchMinutes($symbol)` splits the period from "now − 30 days + a small margin" to "now" into consecutive windows of at most 7 days, giving 5 windows. It sends them as `period1`/`period2` requests with `interval=1m` through `fetchAll()`. The responses are merged by timestamp, so duplicates at the window edges disappear, and points with a `null` close are dropped.

The window splitting and the merging are separate pure functions, so `private/tests/run.php` can test them with fixed timestamps and fake responses.
- *Alternative:* `interval=2m` for the month in one request. This was rejected because the user asked for minute resolution if it is possible, and it is.
- *Alternative:* fetch only the week first and the month when `Månad` is clicked. This was rejected because it adds a second loading state for little gain; all 5 requests run in parallel anyway.

If some windows fail but at least one succeeds, the points that were fetched are returned together with a warning. If all windows fail, the endpoint returns an error.

### A short file cache
The merged result is saved in `data/cache/minutes-<symbol>.json` with a `fetched_at` time and reused for 5 minutes. This lets the user toggle solo back and forth without new Yahoo requests. The file is written with the existing `Storage` helpers (atomic write under a lock). `data/` is already protected by `.htaccess`.

### Endpoint `api/intraday.php`
`POST {ticker}` goes through `run_api()`, so the login and CSRF checks are the same as for the other endpoints. A ticker that is not in `Stocks::load()` gives 400 before any Yahoo request is made.

The response:

```json
{"ticker", "name", "currency", "times": ["2026-11-04 09:00", …], "close": [254.3, …], "warnings": []}
```

- `currency` is Yahoo's `meta.currency`.
- Times are formatted in `Europe/Stockholm`, to match the app's date convention, as `Y-m-d H:i` strings, which Plotly reads as local dates.

About 11 000 points for a month gives roughly 300 kB of JSON. That is acceptable for an on-demand request.

### Separate chart below the main chart
`index.php` gets a `<section id="intraday-panel" hidden>` directly after `#stock-chart`. It contains:
- the heading `<namn> – minutkurser`
- the buttons `Vecka` and `Månad`
- a status line
- a Plotly div

New `public/assets/intraday.js` exposes `window.showIntraday(ticker, name)` and `window.hideIntraday()`, and `setSolo()` in `chart.js` calls them. A request counter discards responses for a stock that is no longer the solo stock, so fast clicking cannot show the wrong stock. The chart uses an SVG `scatter` line for the ~11 000 points, because Plotly rangebreaks do not apply to WebGL (`scattergl`) traces. One SVG line path of this size draws and zooms without noticeable delay. Hover shows the time and the price with the currency.

### Hide time without trading with gap-based rangebreaks
After loading, the client finds every gap of more than 10 minutes between consecutive points and adds a Plotly `xaxis.rangebreaks` entry `{bounds: [previous time, next time]}` for each one. That is about one per night and one per weekend, so roughly 30 for a month.

This is driven by the data, so it works for Stockholm, Frankfurt and US hours (in Swedish time), for half days and for holidays, without exchange calendars.
- *Alternative:* fixed patterns (`bounds: ['sat','mon']` plus an hour pattern). This was rejected because trading hours differ per exchange and holidays would still show as gaps.
- *Alternative:* a category axis. This was rejected because 11 000 category labels are slow and the time ticks become hard to read.

### `Vecka` / `Månad` set the x range and fit the y range
- The buttons set `xaxis.range` to `[last time − 7 days, last time]` or to the full data.
- The y range is computed from the points inside the visible x range, with 5 % padding. It is also recalculated after the user zooms with the mouse (`plotly_relayout`).
- Double-click resets to the active button's range.
- `Vecka` is active when the chart opens.

## Risks / Trade-offs

- [Yahoo changes or rate-limits the unofficial API] → Errors are shown only in the minute panel, and the 5-minute cache limits the number of requests.
- [5 Yahoo requests per solo selection on shared hosting] → They run in parallel with the existing timeouts (10 s connect, 25 s total), which is the same pattern as the history fetch.
- [Large JSON for a month of minutes] → It is fetched only on demand and is about 300 kB. A single SVG line trace renders quickly enough. `scattergl` cannot be used together with rangebreaks.
- [A stock with sparse trading has many gaps over 10 minutes, so many rangebreaks] → Gaps are merged only above 10 minutes, so sparse minutes during the day stay as short lines. If the count grows very large (over 200), only gaps over 60 minutes are hidden.
- [DST change inside the 30 days] → Times are formatted per point in `Europe/Stockholm`. No trading happens at the ambiguous 02:00–03:00 hour.

## Migration Plan

- Upload these files to one.com:
  - `Market.php` to `_private/aktier/src/`
  - `intraday.php` to `aktier/api/`
  - `index.php` to `aktier/`
  - `intraday.js`, `chart.js` and `app.css` to `aktier/assets/`
- Then hard-reload the page.
- No data migration is needed. The new cache files are created on first use.
- Rollback: restore the previous files. Leftover `minutes-*.json` cache files are harmless and can be deleted.
