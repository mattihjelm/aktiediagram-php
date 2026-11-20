## Why

The minute chart places purchases and sales at the day's first minute, because `aktiekop.csv` has no time of day. The user can find the times in the broker's PDF contract notes, one PDF per trade, and wants to record them. They should be entered by hand for existing rows and in the form for new ones, so that the minute chart shows each trade at the minute it was made. PDF scanning is explicitly out of scope.

## What Changes

- `aktiekop.csv` gets an optional last column `time` in the format `HH:MM` (24-hour, Swedish time).
  - It may be empty, and every existing row and import keeps working.
  - The first time the app writes to a file without the column, it adds the column to the header and an empty value to each row. This is the same upgrade the app already does for older files, and no existing value changes.
- Values entered by hand in `time` are kept when the app appends new rows.
  - Invalid values (not `HH:MM`, or outside 00:00–23:59) are treated as missing, and the file still loads.
- The `Registrera aktiehändelse` form gets an optional field `Tid` for purchases and sales. It is hidden for dividends.
  - The field is validated on the server, and an invalid time is rejected with a clear error.
- The transaction list shows the time after the date when there is one, for example `2026-11-11 10:42`.
- **Minute chart:** a purchase or sale with a time is placed at the first minute with a price at or after that time on its date. If the time is after the last minute, it is placed at the day's last minute. Without a time, the day's first minute is used, as today. The hover shows the time (`kl. 10:42`).
- Broker imports are unchanged and leave `time` empty. The main chart's markers stay per day.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `aktiediagram`:
  - The requirement "Klockslag för köp och sälj" is added. It covers the column, manual entry, the form field and the transaction list.
  - The requirement "Transaktioner i minutdiagrammet" is modified: placement by time when there is one.
  - "Registrera och spara aktiehändelser" is extended by the new requirement, so its own text is unchanged.

## Impact

- `private/src/bootstrap.php`: `PURCHASE_FIELDS` gets `time` last.
- `private/src/Purchases.php`:
  - the header upgrade also adds `time`
  - `entryFromForm` validates an optional `time` (empty for dividends)
- `private/src/Chart.php`: the marker `customdata` gets the time as the last element (index 10), empty or `HH:MM`, with invalid values dropped.
- `public/api/purchases.php`: returns `time`.
- `public/index.php`, `public/assets/panel.js`:
  - the `Tid` field, hidden for dividends
  - the time in the transaction list and in the `customdata` of a newly added marker
  - `getTransactions` returns `time`
- `public/assets/intraday.js`: placement and hover by time.
- `private/tests/run.php`: tests for the header upgrade, keeping hand-entered times, validation and the marker `customdata`.
- **Data:** `aktiekop.csv` gets one more column the next time the app writes it. The Python app reads by header name, so the extra column is ignored there.
