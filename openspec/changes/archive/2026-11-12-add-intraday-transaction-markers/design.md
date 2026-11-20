## Context

See proposal.md for motivation and specs/aktiediagram/spec.md for the behavior.

- **Transactions in the main chart.** The `purchase` trace for each stock has `x` (dates) and `customdata`:
  - `[0] chart_price` is the main chart's closing price for that date, in the chart currency (kr for BRK-B).
  - The other fields are `[1] price`, `[2] quantity`, `[3] ticker`, `[4] currency`, `[5] commission`, `[6] type`, `[7] sek_fx_rate`, `[8] ticker_fx_rate` and `[9] amount_currency`.
  - The `marker.symbol` per point comes from `Chart::markerSymbol` (circle, triangle-down, diamond), and the trace color is the stock's color.
  - `panel.js` already parses these rows in `holdingFrom`. There, `price × [7] / [8]` converts an amount to the stock's chart currency.
- **The minute chart.** `public/assets/intraday.js` draws:
  - trace 0, the price line
  - trace 1, the pinned point's marker
  - `data.times` as Swedish-time minute strings, and `data.currency` from Yahoo (USD for BRK-B, while its transactions are in kr)
  - `window.updateIntradayBreakeven` is called from `renderPortfolioSummary` after every transaction change.

## Goals / Non-Goals

**Goals:**
- Show each event in the minute chart at the price where it happened, in the chart's own currency.

**Non-Goals:**
- No time of day for transactions; the import and the form have none.
- No markers in the archive or the CSV.
- No clicking on markers to edit transactions.

## Decisions

### Read transactions from the main chart's purchase trace
- `window.getTransactions(ticker)` in `panel.js` returns `[{date, type, price, quantity, commission, currency, sekRate, tickerRate, chartPrice}]` from the stock's `purchase` trace. It uses the same number parsing as `holdingFrom`, and the SIRI split rule is not applied, because the markers show the quantity as registered.
- *Alternative:* a new API call. This was rejected because the data is already in the page and is updated in place when transactions change.

### Placement and currency
- **Placement:** `firstIndexOfDay(date)` is the first index in `data.times` that starts with the date. If there is none, the event is skipped.
- **Dividends:** `y = data.close[firstIndex]`.
- **Purchases and sales:** the price is converted to the stock's chart currency with `price × sekRate / tickerRate` (both rates at the transaction date), as in `holdingFrom`.
  - If the chart currency is kr but `data.currency` is not SEK (BRK-B), the price is converted by the main chart's own ratio: `y = local × lastCloseOfDay / chartPrice`. `chartPrice` is the main chart's kr close for the date, and `lastCloseOfDay` is the last minute close of that day in USD, so the ratio is that day's USD/SEK as the app already uses it.
  - Any other currency mismatch, or a missing rate, skips the marker.
- *Alternative:* using `data.sekRate` (today's rate) for BRK-B. This was rejected because a purchase made weeks ago would be drawn at the wrong level after the exchange rate moved.

### Trace and hover
- Trace 2 is a `scatter` with `mode: 'markers'`:
  - The symbols and the line come from the main chart's marker style (size 10, outline `#333`), with the stock's color from `#stock-chart`'s `_fullData`.
  - `x` is the minute time string and `y` is the computed price.
  - `customdata` holds a ready Swedish text per point.
- The hover template is `%{customdata}<extra></extra>`, for example:
  - `KÖP 10 st à 450,00 kr · courtage 12,50 kr`
  - `UTDELNING 18 st à 2,80 kr · källskatt 0,00 kr`
- The pin click handler already only accepts `curveNumber === 0`, so clicking a marker does not pin it. Hover in `hovermode: 'x'` shows the marker together with the price at that minute.
- The y-range fit (`fitY`) includes the visible purchase and sale prices, so that a marker outside the price range is not cut off. Dividends are on the curve anyway.

### Updates
- `window.updateIntradayBreakeven` is renamed to `window.refreshIntradayOverlays`. It also restyles trace 2 with recomputed markers and then calls `relayoutX` on the current x-range, so that `fitY` takes in a newly registered purchase or sale. Found during verification: without the refit, a BRK-B purchase at 527 USD was drawn below a 561–599 y-range. `renderPortfolioSummary` calls the new name, and `draw()` builds the trace initially.

## Risks / Trade-offs

- [A transaction made late in the day is drawn at the day's first minute] → This is inherent to date-only transactions and is stated in the spec. The marker's price level still shows where it traded.
- [Including purchase prices in `fitY` can widen the y-range] → Only purchases and sales inside the visible x-range are included, and usually they are near the curve.
- [The SEK-imported sell or buy price of a USD stock] → It is converted with the rates of its own date, `[7]/[8]`, and exactly the same values are already used in the portfolio table.
