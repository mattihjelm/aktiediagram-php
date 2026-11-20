## Context

See proposal.md for the motivation and specs/aktiediagram/spec.md for the behavior.

- **Server:**
  - `Chart::stream` writes one stock trace and one purchase trace per ticker in `aktier.csv`.
  - Identity is the ticker: `meta.ticker`, `legendgroup`, the colour, and grouping markers with `$markers[$marker['ticker']]`.
  - `meta.lastSolo` is a ticker, and visibility is `show_initially` in `aktier.csv`, saved by `api/stock-visibility.php`.
- **Browser:** all of these are keyed by `meta.ticker`:
  - `chart.js`: `stockTraceByTicker`, `toggleTicker`, `setSolo`, `refreshProfitLabel`, `axisKeyByTicker`, the comparison points and the measure traces (`meta.of`)
  - `panel.js`: `portfolioTraces()` (Map by ticker), `getHolding`, `getTransactions`, `getBreakeven`, the list rows, the solo and chart filters, and the in-place inserts after POST and import
  - `intraday.js`: uses `data.ticker` both to fetch minute data (the real ticker) and to look up transactions and holdings (the identity)
  - current-price updates (`refresh.php`, `current-prices.php`) answer per real ticker
- **Purchases:**
  - `PURCHASE_FIELDS` ends with `time`
  - `withCurrentHeader` upgrades older files on write
  - `rowKey` hashes all `PURCHASE_FIELDS`
- **Import:**
  - the duplicate check uses `source_id`, or else `Import::signature` (date, type, ticker, quantity, price, commission, currency)
  - the preview is held in the session

## Goals / Non-Goals

**Goals:**
- One series per (ticker, account) for securities with transactions.
- The account shown in parentheses everywhere a name with an account is shown.
- The account entered in the form and chosen for an import.
- The saved view per series.

**Non-Goals:**
- No change to `aktier.csv` or its 100-row limit. The number of series may exceed 100.
- No list of allowed accounts and no account names; an account is just a letter.
- No moving of transactions between accounts in the app.
- No combined "all accounts" view of a security.
- No new traces without a reload; see "New series".

## Decisions

### Storage
- **`PURCHASE_FIELDS`** gets `account` last, and `bootstrap.php` adds `const DEFAULT_ACCOUNT = 'T'`.
- **Reading:** `Purchases::rowsFromText` sets `account` to `T` when it is missing or empty, and uppercases it.
- **The header upgrade:** `withCurrentHeader` adds `account` to its list of required columns. The first write after the upgrade stores `T` on old rows.
- **Row keys:** keys are computed from the parsed rows in both `Chart` and `remove`, so the keys stay consistent across the upgrade.
- **Validation:** `Purchases::account($value)` trims and uppercases the value and accepts `/^[A-Z]$/`. Otherwise it throws `InvalidArgumentException('Kontot ska vara en bokstav A–Z.')`. The form and the import both use it.

### Series key
- **The key** is `"<ticker>"` for a security without transactions, and `"<ticker>|<account>"` otherwise.
  - `|` never occurs in Yahoo tickers.
  - A security with transactions always has an account, because of the `T` default.
- **`Chart`** computes the accounts per ticker from the parsed purchases, sorted A–Z, and writes one stock trace and one purchase trace per series, in `aktier.csv` order and then account order. Each series gets its own colour.
- **Trace `meta`:**
  - `series`: the identity
  - `ticker`: the real ticker
  - `account`: `''` when the series has none
  - `displayName`: `"Tele2 (T)"` or `"Tele2"`
- **`legendgroup`** is the series key.
- **Marker customdata** gets the account at index 12, after `row_key`.
- **The browser uses `meta.series` for identity:** visibility, solo, legend rows, profit labels, comparison points, measure traces, axis keys, `portfolioTraces`, list filters, `getHolding`, `getTransactions` and `getBreakeven`.
- **The browser uses `meta.ticker` for:** the currency (`stockCurrency`), the minute data request, the CSV download, current-price requests and the form's security selection.
  - A current-price answer for a ticker updates every stock trace with that ticker.
  - The Resultat row's update button sends the real ticker.
- **The browser state** is `stockTraceBySeries`, renamed from `stockTraceByTicker`. `window.stockGraphState` exposes it for `intraday.js` and `panel.js`, and also `seriesOf(ticker, account)`.
- **`window.showIntraday(series)`** fetches the minute data with the series' ticker and passes the series to `getTransactions`, `getHolding` and `getBreakeven`.

### Display names
- **The server** builds `displayName` once, `"<name> (<account>)"`.
- **The browser** never builds names itself. It reads `displayName` for the legend, curve labels, solo aria, the minute-chart title, the lists, statuses and comparison labels.
- **Hover templates and the purchase trace name** use the display name.
- **The import preview** counts by type and display name.

### Visibility and solo
- **Series without an account:** `api/stock-visibility.php` keeps saving them to `aktier.csv`.
- **Series with an account:**
  - it saves them in `aktievy.json` as `series_visible: {"TEL2-B.ST|I": false, …}` under the existing lock, via `Chart::saveView`, which merges the map and adds `series_visible` to its key order
  - the payload becomes `{series, visible}`; the old `{ticker, visible}` still works for series without an account
- **Initial visibility:** `series_visible[key]` if set, otherwise the ticker's `show_initially`.
- **`last_solo`:**
  - it stores the series key
  - `api/view-range.php` accepts a ticker in `aktier.csv` with an optional `|<A–Z>`. This file was found missing from the plan during implementation, when saving solo returned 400.
  - `Chart::lastSolo` takes the list of series keys
  - an exact match wins; otherwise a bare ticker maps to its first series in A–Z order; otherwise null

### Form
- **The field:** `#purchase-account` is a text input with `maxlength=1`, `autocapitalize=characters`, `required`, and `list="account-options"`.
- **Suggestions:** a `<datalist>` of the accounts used, from `meta.accounts` in the figure layout, plus `T`.
- **The value:**
  - it starts as `T`
  - a curve click sets it from the clicked series' `meta.account` when the series has one
  - after a submit the value stays
- **The POST payload** gets `account`. `entryFromForm` validates it and `append` stores it.
- **The response** includes `account` and `series` (`ticker|account`).

### Import
- **The field:** `#import-account` is the same kind of input, beside `Importera transaktioner`.
- **The preview:**
  - the POST to `api/import.php?step=preview` sends `account` in the form data next to the file
  - the server validates it before parsing, sets `account` on every converted row and keeps it in the session preview
  - the preview text shows `Konto: I`
- **The duplicate check:** `Import::selectNew` keys known IDs by `account|source_id`, and `signature` includes the account. So the same file on another account is all new, and on the same account all duplicates.
- **Confirm** writes the rows with the account. The markers returned carry `account` and `series`.

### New series
- After a POST or an import confirm, the browser looks up `stockTraceBySeries[series]` for every new row.
- **If any series is missing**, it stores the status text in `sessionStorage` (`aktier.flash`) and calls `location.reload()`. The cases are:
  - a new account on a security
  - the first transaction on a security without transactions, whose series was the bare ticker
- **On start,** `app.js` shows and clears the stored status. If storage is unavailable, the reload still happens without the message.
- **Otherwise** the in-place insert works as today, but finds the purchase trace by series.
- **Deleting** the last row of a series leaves the series in place without markers. A reload drops it or turns it back into a bare-ticker series.
- **Why a reload:** building traces in the browser would duplicate `Chart::stream`'s colour, axis and measure setup, and new accounts are rare.

### Legend sort and spec wording
- The sort orders work on series. `Osorterad` is `aktier.csv` order, then account order.
- The import requirement still names the column header `Aktie`, which an earlier change renamed to `Värdepapper` without updating that sentence. The MODIFIED block fixes it.

## Risks / Trade-offs

- [Every identity use of `meta.ticker` must move to `meta.series`; a missed one merges accounts silently] → A Playwright fixture with one ticker on two accounts checks the legend rows, Resultat rows, solo, minute-chart transactions, comparison and delete. A grep check in tasks lists every remaining `meta.ticker` use, which must be a real-ticker use.
- [An import on the wrong account adds every row again] → The preview shows the account and the number of new rows before the confirmation. A wrong import can be undone with `Ta bort`, row by row.
- [Old `last_solo` and visibility values] → A bare-ticker `last_solo` maps to the first series. Visibility falls back to `show_initially`.
- [The first write rewrites every row with `T`] → It is the same mechanism as earlier column upgrades. The row keys are recomputed from the parsed rows on both sides.
- [More than 100 series] → `Chart::stream` already streams trace by trace. Memory is unchanged per trace.

## Migration Plan

- No manual step.
- The deployed code reads files without `account` as `T`. The next write on the server adds the column.
- Rollback: older code ignores the extra column when reading. Its `Csv::write` with the old `PURCHASE_FIELDS` would drop the column on the next write, losing non-`T` accounts. So do not roll back after importing to another account.
