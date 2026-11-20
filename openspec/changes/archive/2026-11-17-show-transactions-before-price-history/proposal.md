## Why

When a security's price history at Yahoo Finance starts after its first transactions, those transactions disappear from the app. The rows are saved in `aktiekop.csv`, but `Chart::marker` drops every event without a price on or before its date, and the transaction list and the `Resultat` table are both built from the same marker data.

The user found this with a Swedish fund whose Yahoo history starts years after the first purchases, so those purchases were missing. This also makes the fund's quantity, GAV and returns wrong, because the early purchases are left out of the calculation.

## What Changes

- Every valid event in `aktiekop.csv` is shown in `Transaktioner` and counted in `Resultat` (quantity, GAV, returns, dividends), even when it falls before the security's first price.
- Such an event gets no marker in the main chart, because the curve does not exist there. Events from the first price onwards are drawn as today.
  - In the measure modes, the marker uses the curve's value at its date, which is already empty before the history starts.
- The registration form keeps rejecting dates before the first price (`Det finns ingen kursdata före köpdatumet.`). Imports already save such rows and need no change.
- No data changes: the rows are already in `aktiekop.csv`.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `aktiediagram`: the requirement "Visa transaktioner i diagram och lista" is modified. Every event is listed and counted, and only the chart marker requires a price on or before the event's date.

## Impact

- `private/src/Chart.php`: `marker()` returns the event with `chart_price` null instead of dropping it, and the purchase trace's y is null for such events.
- `public/assets/chart.js`: the purchase-trace y values in `rebaseToVisibleStart` are null when `customdata[0]` is null. The click and price lookups already work on stock traces only.
- `public/assets/panel.js`: imported markers added in the open view get y null when `chart_price` is null.
- `private/tests/run.php`: a test that a marker before the series start is kept with a null `chart_price`, if a series can be set up in the tests; otherwise it is verified in the browser.
- The results calculation (`holdingFrom`) does not use `chart_price`, so it needs no change.
