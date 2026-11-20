## Context

See proposal.md for motivation and specs/aktiediagram/spec.md for the behavior.

- **`aktiekop.csv`.** It is semicolon-separated, with columns from `PURCHASE_FIELDS` (`date … amount_currency`).
  - `Purchases::append` keeps the file text unchanged and appends new lines in `PURCHASE_FIELDS` order.
  - `Purchases::withCurrentHeader` rewrites the file once with `Csv::write(PURCHASE_FIELDS, …)` if the header lacks one of `commission`, `transaction_type`, `source_id` or `amount_currency`.
  - `rowsFromText` reads by header name and fills defaults.
- **Form events.** `Purchases::entryFromForm` validates them, and `public/api/purchases.php` returns the entry plus chart fields.
- **Markers.** `Chart::marker`/`markerCustomdata` build each marker's `customdata`, indexes 0–9. `panel.js` builds the transaction list and `getTransactions` from that `customdata`, and extends the trace with the same layout when an event is added.
- **Minute chart.** `intraday.js` `computeTransactionMarkers` places a marker at `days[date][0]`, the day's first minute.
- **Import.** `Import` builds rows with the same field keys, so a missing `time` becomes empty through `$row[$field] ?? ''`.

## Goals / Non-Goals

**Goals:**
- An optional time per event, which never breaks the existing files, the imports or the Python format.

**Non-Goals:**
- No PDF reading.
- No editing of existing events in the UI. Old times are entered by hand in the file.
- No seconds, and no time zone other than Swedish.
- No change to the main chart's daily markers.

## Decisions

### Column and upgrade
- `PURCHASE_FIELDS` gets `time` last. `withCurrentHeader` adds `time` to its list of required columns, so the next write to a file without it rewrites the file once with an empty `time` for every row. That is the existing mechanism, and `Csv::write` keeps every other value as read.
- New rows are written with all nine fields. Rows written by hand with eight fields after the header has nine are read with `time` missing, which `rowsFromText` fills as `''`.
- *Alternative:* never rewriting, and only reading `time` if present. This was rejected because appended rows would then have fewer columns than the header, and spreadsheet tools show that as misaligned.

### Validation
- `Purchases::validTime(?string): ?string` returns `HH:MM` for `^([01]\d|2[0-3]):[0-5]\d$`, after trimming, and otherwise null.
  - **Form:** an empty value gives `''`. An invalid value throws `InvalidArgumentException('Ange tid i formatet TT:MM, till exempel 10:42.')`. Dividends always get `''`.
  - **Reading:** `Chart::marker` puts `validTime($row['time']) ?? ''` in `customdata[10]`, so a bad hand-entered value is ignored and never shown.

### UI
- `index.php` gets `<label id="purchase-time-label">Tid <input id="purchase-time" type="time"></label>` next to the date. `type="time"` gives a native picker, and its value is always `HH:MM` or empty.
  - The existing type-change handler hides the label for `UTDELNING`.
  - The submit handler sends `time`.
- The transaction list shows `date + (time ? ' ' + time : '')` in the date column, and sorting is unchanged.
- `getTransactions` adds `time: details[10] || ''`. The new-marker `extendTraces` call in `panel.js` appends `result.time` as `customdata[10]`.

### Minute chart placement
- `computeTransactionMarkers` uses `day[0]` for dividends or an empty time. Otherwise it uses the first index in `[first, last]` whose `data.times[i].slice(11) >= time`, or `last` if there is none. Times are strings `HH:MM`, so string comparison is chronological.
- For BRK-B the conversion still uses `data.close[last] / chartPrice`, the day's ratio, independent of the minute.
- The hover gets ` · kl. HH:MM` when the time is set.

## Risks / Trade-offs

- [The one-time file rewrite on the next save] → The same mechanism already upgraded older files. It keeps values as read, and the change's verification compares every row before and after on a copy.
- [Editing the file in Excel can change separators or decimals] → This is outside the app. The proposal tells the user to edit in a text editor.
- [Trades made before the open, for example in the pre-market] → They are placed at the first minute, the same as without a time.

## Adjustments during implementation

- **The time field is cleared after a save**, together with the quantity and the price, so that the next event does not reuse a time by mistake.
- **The new-marker `customdata`** built after a form save had only indexes 0–8, without `amount_currency`. It now has `amount_currency` at index 9 and `time` at index 10, the same layout as the server-built markers.
- **An invalid hand-entered time** in the file giving an empty `customdata[10]` was verified in the browser and not in `run.php`. Building a `Chart` marker needs cached price history, which the unit tests do not have.
