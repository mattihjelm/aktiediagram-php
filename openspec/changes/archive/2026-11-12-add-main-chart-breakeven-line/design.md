## Context

See proposal.md for motivation and specs/aktiediagram/spec.md for the behavior.

- **Index scale.** `public/assets/chart.js` shows each stock as `price / visibleBases[curve] × 100`. `visibleBases` is set by `rebaseToVisibleStart` on every range change.
- **Overlays.** All overlays (endpoint labels, comparisons, the first comparison point) are built by `comparisonOverlays(targetRanges)`. It returns `{shapes, annotations}`, and `refreshVisibleView` and the comparison handlers relayout with it. `refreshVisibleView` also computes the y-ranges.
- **Logarithmic scale.** Each stock has its own hidden axis (`axisKeyFor(curve)`), and `toAxis` converts annotation y to log10. Comparison shapes use plain index values on the stock's axis.
- **Solo.** `setSolo` sets `soloTicker` and `applyVisibility`. In linear mode `applyVisibility` does not call `refreshVisibleView`. `window.getSoloTicker()` exposes the solo ticker.
- **Break-even in the minute chart.** `public/assets/intraday.js` computes it from `window.getHolding(ticker)` (`localBasis`, `dividendLocal`, `held`, `currency`) and converts kr → USD for BRK-B. The main chart's currency for a stock is `holding.currency`, which is kr for BRK-B, so no conversion is needed there.
- **Transaction changes.** These re-render the portfolio summary, which already calls `window.updateIntradayBreakeven`.

## Goals / Non-Goals

**Goals:**
- One break-even calculation shared by both charts.

**Non-Goals:**
- No break-even line for several stocks at once, and none without solo.
- No hover text on the line.
- No time-varying (historical) break-even.

## Decisions

### Shared break-even in panel.js
- `window.getBreakeven(ticker)` returns `{value, currency}` in the holding's currency, or `null` when nothing is held or `dividendLocal` is null.
- `intraday.js` `computeBreakeven` calls it and keeps only its kr → minute-chart-currency conversion.
- *Alternative:* duplicating the formula in `chart.js`. This was rejected because the two lines must always agree.

### Drawn inside comparisonOverlays
- When `soloTicker` is set and `getBreakeven` returns a value, the curve is the solo stock's trace, and its line is drawn at `index = value / visibleBases[curve] × 100`:
  - a shape with `xref: 'paper'`, `x0: 0`, `x1: 1`, `yref: axisRef(axisKeyFor(curve))` and `y0 = y1 = index`, with the same green dash as the minute chart
  - plus a label annotation at the left edge, because the curve's endpoint label is at the right edge
- Because `comparisonOverlays` runs on every view refresh, the line follows rebasing, zoom and the log toggle without extra wiring.
- The label is placed by comparing `toAxis(index)` with the target y-range of the curve's axis (`axisRange(axisKey, targetRanges)`):
  - within the range: at `yref` = the axis, `y = toAxis(index)`
  - otherwise: at `yref: 'paper'` with y 1 or 0, and `▲`/`▼`
  - `fitYRange` is not changed, so the y-axis keeps fitting the curve.
- *Alternative:* a separate relayout path. This was rejected because every existing `Plotly.relayout(graph, comparisonOverlays())` call would then overwrite the shapes.

### Refresh triggers
- Solo on and off need no extra call. Every visibility change fires `plotly_restyle`, whose handler already calls `refreshVisibleView` (and thereby `comparisonOverlays`) after 60 ms, in both linear and log mode. `soloTicker` is set or cleared before the visibility changes. This was verified in the browser.
- `window.refreshStockChartOverlays = () => Plotly.relayout(graph, comparisonOverlays())` is called from `renderPortfolioSummary` next to `updateIntradayBreakeven`, so that transaction changes move the line.
  - It must not call `renderPortfolioSummary` back, to avoid a loop.
  - It always relayouts the overlays, which only touches `shapes` and `annotations` and does not trigger a rebase.

## Risks / Trade-offs

- [Plotly shapes on log axes] → The comparison shapes already use plain index values on the per-stock log axes and render correctly, so the break-even shape uses the same convention. The manual check covers the log scale.
- [`renderPortfolioSummary` runs often, for example on legend changes] → The relayout is cheap: a few shapes and annotations, and only while a stock is solo.
- [The base price changes with the visible start date] → This is intended. The line always marks the same price as the curve's own scale.
