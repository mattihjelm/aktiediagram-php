## Context

See proposal.md for motivation and specs/aktiediagram/spec.md for the behavior.

`add-moving-average-deviation-mode` (archived 2026-11-12) built the deviation in `public/assets/chart.js`:

- `scaleMode` takes one of the values `linear`, `log`, `ma200` and `log_ma200`.
- `deviationSeries(traceIndex)` is a cached series computed over the whole history. `deviationAt(trace, date)` and `yForPrice` look up values in it.
- Deviation-only mode replaces the stock y-values, the hover template, the axis title and the 0 % line, and it hides the break-even line.
- In `log_ma200`, appended `deviation` traces (`meta.of`) are drawn against `deviationAxisKey`, a visible left overlay axis with `tickmode: 'auto'`. `syncDeviationTraces()` controls their visibility, and `refreshVisibleView` fits their axis.
- `panel.js` has three checkboxes (`#scale-linear`, `#scale-log`, `#scale-ma200`) and the combination rules. `Chart::SCALES` and `api/view-range.php` validate `scale`.

## Goals / Non-Goals

**Goals:**
- Turn "deviation" into a generic "measure", so that `ma200`, `drawdown` and `change63` share every code path, and a further measure only needs a series function, a title and a hover label.

**Non-Goals:**
- No user-selectable period. 63 trading days is a constant, and the label says 3 months.
- No more than one measure at a time.

## Decisions

### Mode = log flag + measure
- `scaleMode` stays a single string, for persistence and for `setStockChartScale`. It is parsed by `parseScale(mode)`, which returns `{log, measure}`:
  - `log` is true for `log` and `log_*`
  - `measure` is `ma200`, `drawdown`, `change63` or null
- The checks `scaleMode === 'ma200'` become `measureOnly()`, meaning a measure without log. The checks `scaleMode === 'log_ma200'` become `measureOverlay()`, meaning log and a measure.
- `Chart::SCALES` lists the eight values: `linear`, `log`, `ma200`, `drawdown`, `change63`, `log_ma200`, `log_drawdown` and `log_change63`.
  - `Chart::isLogScale` becomes `$scale === 'log' || str_starts_with($scale, 'log_')`.
- *Alternative:* two saved keys (`log`, `measure`). This was rejected because the single `scale` value is already stored and validated, and extending its list keeps old files and the API unchanged.

### Measure definitions
- `MEASURES` is a table with the three measures `ma200`, `drawdown` and `change63`. Each measure has:
  - `series(prices)`, which returns an array with null where there is no value
  - `title`, for example `Fall från tidigare topp (%)`
  - `hoverLabel`, the text used in the hover, for example `Fall från topp`
- The series per measure:
  - `ma200`: the existing rolling mean.
  - `drawdown`: a running max over valid prices, giving `(p / max − 1) × 100`. Before the first valid price the value is null.
  - `change63`: `(p[i] / p[i − 63] − 1) × 100` when both prices are valid, otherwise null.
- `measureSeries(traceIndex, measure)` caches per (trace, measure) and is invalidated when the `customdata` length changes. `deviationSeries` and `deviationAt` become `measureSeries` and `measureAt`, which take the current measure.

### Measure traces in log mode
- The appended overlay traces are renamed in the code to "measure traces" (`meta.role = 'measure'`). They still use `meta.of` for the stock and `measureAxisKey` for the axis.
- On a mode switch where the measure changes, their `y` is restyled to the new measure's series, and their hover template is set to `<namn> <hoverLabel>: %{y:+.1f} %`. The axis title becomes the measure's title.
- *Alternative:* one set of overlay traces per measure. This was rejected because only one measure is shown at a time, and three sets would triple the hidden traces.

### UI rules
- `panel.js` gets two more checkboxes, `#scale-drawdown` and `#scale-change63`.
- The change handler:
  - Checking `Linjär` clears all the others.
  - Checking a measure clears `Linjär` and the other measures.
  - Checking `Logaritmisk` clears `Linjär`.
  - If nothing is left checked, `Linjär` is checked.
- The mode string is `log` and/or the checked measure, combined as `log_<measure>`.

## Risks / Trade-offs

- [Renaming deviation → measure in `chart.js` touches code that was just verified] → The manual check repeats the key deviation checks from the previous change's `verification.md` (values against an independent computation, combined mode, persistence).
- [Drawdown of BRK-B is in kr in the main chart, so the USD/SEK rate is included] → This is the same as for all main-chart values, and it is documented in the verification.
- [The previous `meta.role = 'deviation'` name may be referenced in filters] → All filters are updated in the same task, and a search for `'deviation'` should find no remaining references.

## Problems found during verification

- **Overlay traces need initial values.** The measure traces were first appended with `y: []`. Making their axis visible then threw `getPointAtLength … path is empty` inside Plotly and aborted the mode switch. They are now seeded with the `ma200` series, and `syncMeasureTraces` replaces the values when another measure is chosen.
- **Switching from a measure alone to log + measure.** `applyAxisMode` redraws before `rebaseToVisibleStart` has replaced the negative measure values with index values. An endpoint label at `log10(negative)` = NaN made Plotly throw, which also cancelled the rebase. `comparisonOverlays` now skips endpoint labels without a finite position, and they are drawn again after the rebase. The same defect existed in the archived deviation change, for ma200 → log+ma200, which was not covered by its verification.
- **Concurrent Plotly calls in `syncMeasureTraces`.** The data, title and visibility updates were started together with `Promise.all`. They now run in sequence: one `Plotly.update` for the data and the axis title, then a visibility `restyle`.
- **The minute chart was purged while it was still redrawing.** `showIntraday`/`hideIntraday` called `unpin()`, which started a `restyle` and a `relayout` without waiting for them, and then called `Plotly.purge` straight away. Plotly's deferred redraw then failed (`e.emit is not a function`, `_redrawFromAutoMarginCount`). `unpin(false)` now only resets the pin state when the chart is about to be purged. This defect came from the pinned-point change and showed up depending on timing; it is fixed here because the new mode switches made it visible.
