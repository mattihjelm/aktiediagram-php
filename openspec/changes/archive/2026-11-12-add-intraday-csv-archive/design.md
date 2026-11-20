## Context

See proposal.md for motivation and specs/aktiediagram/spec.md for the behavior.

- `Market::fetchMinutes($symbol)` returns `{currency, times, close, warnings}`:
  - `times` are Swedish-time strings `Y-m-d H:i`, sorted, unique, with null closes dropped.
  - A non-empty `warnings` means that some of the five 7-day windows failed.
  - Results are cached for 5 minutes, and only complete fetches are cached.
- `public/api/intraday.php` calls it for `Stocks::find($ticker)`, so only tickers in `aktier.csv` are accepted.
- `Storage::withLock` provides `flock`-based locking, and `Storage::line` formats CSV cells.
- `private/data/` is outside the web root on one.com and has `Require all denied` as a fallback. `data_path()` resolves files under it.
- The app runs on one.com shared hosting with PHP only and no scheduled jobs.

## Goals / Non-Goals

**Goals:**
- An append-only archive per stock that can be opened directly in Swedish Excel.
- No change to the minute chart's data or to the existing data files.

**Non-Goals:**
- No scheduled or bulk fetching, and no fetching of stocks that are not solo.
- The archive is not shown in the chart, and older gaps are not backfilled.
- No deletion or editing of archive files from the web page.

## Decisions

### Storage location and format
- The archive for each stock is `data_path('intraday/<symbol>.csv')`. The symbol is sanitized like the cache file names (`[^A-Za-z0-9._-]` → `_`). The `intraday/` directory is created by `Storage::withLock` when it is missing.
- The file is semicolon-separated with the header `time;close;currency` and CRLF line endings, like `Storage::line`.
- The close has a decimal comma and is rounded to at most 4 decimals with trailing zeros dropped. Semicolons and decimal commas make the file open correctly in Swedish Excel, which the user is likely to use.
  - *Alternative:* a decimal point. This was rejected because Swedish Excel would then read the prices as text.
- The currency column is repeated on every row, so that the file is self-describing even if a stock's currency changes or the file is shared alone.

### Append-only update
- The update runs under an exclusive lock on the file:
  1. Read the file's last line by seeking from the end, without reading the whole file. The archive grows by about 10 000 rows per month.
  2. Parse its `time`.
  3. Append `fopen(..., 'a')` lines for every minute with `time` > last time and `time` < the current minute.
  4. Create the file with its header line when it does not exist.
- Plain string comparison on `Y-m-d H:i` is chronological. The one ambiguous hour, the autumn DST change at 02:00–03:00, has no trading on any of the app's exchanges.
- The current minute is excluded by comparing with `date('Y-m-d H:i')` in Europe/Stockholm. Its close can still change.
- The update is skipped when `warnings` is non-empty, so a failed middle window is never bridged with newer rows. The status says why.
- The logic lives in a small class `IntradayArchive` in `private/src/`. It has a pure function for selecting and formatting new rows, which is unit-tested, and a file function for the update.
- *Alternative:* merging all rows and rewriting the file with `writeAtomic`. This was rejected because append is cheaper, and the requirement says existing rows are never touched. A crash mid-append can at worst leave a partial last line. The last-line parser ignores a line it cannot parse by looking at the previous line, so the next update repairs the tail by continuing from the last valid time.

### API
- `intraday.php` keeps returning the minute data and adds an `archive` object:
  - after a complete fetch: `{rows, first, last, added}`
  - after a partial fetch: `{rows, first, last, skipped: true}` from `IntradayArchive::info`, without writing
  - on a failure: `{error, rows?, first?, last?}`, so that the download link is still shown when the file exists
  - An archive failure is caught and reported. It never turns the minute response into an error.
  - File-open and write warnings are suppressed with `@`, so they cannot leak into the JSON response. The exception carries the message instead.
  - `rows`, `first` and `last` are counted by streaming the file with `fgets` after the append. This takes a few milliseconds for about 10 000 rows per month.
- New `public/api/intraday-csv.php` (GET through `run_api(['GET'], ...)`, so login is required and there is no CSRF requirement for GET):
  1. `Stocks::find($_GET['ticker'])`.
  2. Respond 404 with JSON if there is no file.
  3. Otherwise stream the file under a shared lock with `Content-Type: text/csv; charset=utf-8` and `Content-Disposition: attachment; filename="minutkurser-<symbol>.csv"`.

### UI
- An `<a id="intraday-download" download hidden>` link with the text `Ladda ner CSV` is placed in `#intraday-header`. `intraday.js` sets its `href` to `api/intraday-csv.php?ticker=...` and shows it when `archive.rows > 0`.
- The archive summary is appended to the existing status text, for example `Arkiv: 41 230 minuter (2026-10-13 09:00 – 2026-11-12 15:28), 380 nya.`

## Risks / Trade-offs

- [Gaps if the stock is not selected as solo for more than ~30 days] → This is accepted per the user's choice of no scheduled fetching, and the proposal documents it. The appended rows simply resume after the gap.
- [Two tabs updating the same file at once] → The exclusive lock serializes them, and the second one sees the new last time and appends nothing.
- [File size growth (~250 KB per stock and month)] → This is negligible on the web host. The download streams the file instead of loading it into memory.
- [A ticker removed from `aktier.csv` keeps its file, but the file cannot be downloaded] → This is acceptable. The file can still be fetched by FTP.
