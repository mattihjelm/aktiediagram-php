## Context

See proposal.md for motivation and specs/aktiediagram/spec.md for the behavior.

- **Portfolio figures are computed only in the browser.** `renderPortfolioSummary` in `public/assets/panel.js` walks each stock's `purchase` trace in the main chart and computes `held`, `localBasis` and `dividendSek`. The `customdata` of each event holds `[chart_price, price, quantity, ticker, currency, commission, type, sek_fx_rate, ticker_fx_rate, amount_currency]`. GAV is `localBasis / held`, in the chart currency from `currencyFor`. The SIRI split before 2024-09-10 is handled there.
- **Dividends are only summed in SEK today.** Each one is `(price × quantity − commission) × sek_fx_rate`. Some dividends are imported in SEK for USD stocks (`amount_currency` = SEK).
- **Berkshire has different currencies in the two charts.** Its transactions and its main-chart series are in kr. The minute chart (`Market::fetchMinutes`) returns Yahoo's currency, which is USD for BRK-B. For every other stock the minute-chart currency equals the chart currency (`kr` ≙ `SEK`).
- **The pinned point owns `layout.shapes`.** `public/assets/intraday.js` sets `shapes: [pinLine]` in `pin()` and `shapes: []` in `unpin()`.

## Goals / Non-Goals

**Goals:**
- The value equals what the portfolio table shows: the same GAV, the same held quantity and the same net dividends.

**Non-Goals:**
- No break-even line in the main chart.
- No historical or time-varying break-even. The line is flat at today's value.
- No change to how the portfolio table computes anything.

## Decisions

### Reuse the portfolio calculation instead of duplicating it in PHP
- The loop body of `renderPortfolioSummary` is extracted into a function `holdingFor(ticker)` that returns `{held, localBasis, dividendSek, dividendLocal, currency, ...}`. It is exposed as `window.getHolding(ticker)` and used by the table as before.
- *Alternative:* computing in `api/intraday.php` from `aktiekop.csv`. This was rejected because it would duplicate the split, FX and validity rules in a second language, and the two could drift apart from the table.

### Dividends in local currency use the dividend-date rates
- Each dividend adds `net × sek_fx_rate / ticker_fx_rate` to `dividendLocal`. For a USD dividend on a USD stock this is exactly `net`. For a SEK dividend on a USD stock it is SEK converted at that day's USD/SEK rate.
- If either rate is missing, `dividendLocal` is `null`, and no line is shown.
- *Alternative:* `dividendSek / today's rate`. This was rejected because it would move the line with today's exchange rate even when nothing was bought.

### Break-even value and currency conversion
- `breakeven = (localBasis − dividendLocal) / held`, shown only when `held > 0`.
- If the chart currency is kr/SEK and `data.currency` is not SEK (BRK-B), the value is divided by `data.sekRate`. `api/intraday.php` adds `sekRate` from `new Fx([currency])->latest(currency)` when the currency is a known `FX_TICKERS` currency. It reads the cached daily FX history, so there is no extra Yahoo request in the common case.
- Any other currency mismatch, or a missing rate, means no line.

### Drawing: shape + annotation, and a shared shapes list
- The line is a layout shape with `xref: 'paper'`, `x0: 0`, `x1: 1` and `yref: 'y'`, drawn dashed in green. The label is an annotation at the right edge (`xref: 'paper'`, `x: 1`, `xanchor: 'right'`).
- A `shapes()` helper returns `[breakevenLine?, pinLine?]`, and both `pin()`/`unpin()` and the break-even update relayout with it. The pin no longer overwrites the whole list.
- `fitY` does not include the break-even. After every relayout that sets `yaxis.range`, the label is placed:
  - at the line's y if it is within the range
  - otherwise at `yref: 'paper'` y = 1 with `▲` (above) or y = 0 with `▼` (below)
- *Alternative:* extending the y-range to include the line. This was rejected because a break-even far from today's price would flatten the minute curve.

### Updates
- `renderPortfolioSummary` calls `window.updateIntradayBreakeven()` at its start, so that it also runs when the table is empty, which recomputes and relayouts if the minute chart is drawn. Transactions change through the existing purchase handlers, which all re-render the summary, so no new event wiring is needed. `draw()` also computes the line initially.

## Risks / Trade-offs

- [The BRK-B conversion uses today's USD/SEK rate while GAV in kr used historical rates] → This is the only consistent way to show a kr cost on a USD chart. The label shows USD so it is clear which unit is shown.
- [Extracting the loop body could change the table's numbers] → The table keeps using the same function. Verified: the table before and after the change was identical (same rows, same SHA-256) on the copied data.
- [`sekRate` missing (FX history not cached or unavailable)] → No line for BRK-B. Other stocks do not need it.
