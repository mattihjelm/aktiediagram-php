## Context

See proposal.md for motivation and specs/aktiediagram/spec.md for the behavior.

- **`Chart::marker($row)`.** It validates price, quantity, commission and type. It returns null when `priceOnOrBefore($ticker, $date)` is null, so the event never reaches the page.
  - The purchase trace for each stock has `x` = dates, `y` = `chart_price / base × 100` and `customdata[0]` = `chart_price`.
  - Everything in the browser that lists or calculates transactions reads that trace: the transaction list, `holdingFrom`/`Resultat`, `getTransactions` and the minute-chart markers.
- **Browser rebasing.** In linear and log mode, `chart.js` `rebaseToVisibleStart` recomputes the purchase y as `Number(customdata[0]) / base × 100`. In measure modes it uses `measureAt(stock, date)`.
- **Imported markers.** `panel.js` appends them with `y = chart_price / base × 100`.
- **What does not use `chart_price`:** `holdingFrom` uses `details[1]` (price), `[2]`, `[5]`, `[6]`, `[7]` and `[8]` only. `getTransactions` uses `chartPrice` only for the BRK-B day ratio, and requires it to be > 0.

## Goals / Non-Goals

**Goals:**
- No valid event is silently dropped from the list or the calculations.

**Non-Goals:**
- No second price source and no back-filled history.
- No change to the form's date check.
- No change to how dates before the history are drawn on the curve, which stays absent.

## Decisions

### Keep the marker with a null chart price
- `marker()` sets `chart_price` to null instead of returning null when there is no price on or before the date. All other validation is unchanged, so malformed rows are still skipped.
- The purchase trace's `y` is null for such markers, and Plotly does not draw points with null y.
- *Alternative:* using the first available price as the chart price. This was rejected because it would draw a 2019 purchase at the 2022 price level and date, which misrepresents both.

### Keep y null in the browser
- `rebaseToVisibleStart` (linear and log): purchase y = `row[0] === null ? null : Number(row[0]) / base × 100`. A small helper `chartPriceOf(row)` returns null for null or non-positive values.
- Measure modes already return null through `measureAt` for dates before the history.
- `panel.js` import: `y = marker.chart_price === null ? null : …`.
- `chart.js` line 20 (`visibleBases` from `customdata[0]`) is for stock traces only and is unaffected.

### Edge effects
- **Minute-chart markers** only exist for the last 30 days, where a price exists.
- **The BRK-B ratio** requires `chartPrice > 0`, so a null value skips that marker as today.
- **Totals in `Resultat`** change for every stock with events before its history. They become correct, but they differ from what was shown before. The verification compares one fund's numbers with a hand calculation.

## Risks / Trade-offs

- [Users may expect a marker for every listed event] → The spec states that events before the first price have no marker. The list and the totals show them.
- [Other stocks with events before their history] → Their totals also change, for the better. The verification lists any such stocks found in the data copy.
