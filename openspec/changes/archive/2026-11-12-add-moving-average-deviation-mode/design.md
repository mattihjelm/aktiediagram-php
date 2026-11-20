## Context

See proposal.md for motivation and specs/aktiediagram/spec.md for the behavior.

- **Server.** `private/src/Chart.php` emits one `stock` trace per ticker:
  - `x` holds dates.
  - `customdata[i] = [price, formatted price, factor, fx]` holds the raw closing price in the chart currency (BRK-B in SEK).
  - The `purchase` traces have `customdata[0] = chart_price`.
  - The y values are recomputed in the browser.
  - The stock traces' `hovertemplate` is `"<label>: %{customdata[1]}<br>Index: %{y:.1f}"`.
- **Browser.** `public/assets/chart.js`:
  - `rebaseToVisibleStart` rebases every trace to `price / visibleBases × 100` and then calls `refreshVisibleView`.
  - `refreshVisibleView` fits the y-ranges (shared linear, or per-stock log axes), builds the endpoint labels and relayouts the overlays from `comparisonOverlays`.
  - `applyAxisMode(enabled)` switches between linear and per-stock log axes. `isLogAxis()` reads `layout.yaxis.type`.
  - Comparisons store prices and draw at `price / visibleBases × 100`. The break-even line also uses `visibleBases`.
- **View settings.** `aktievy.json` holds `start`, `end` and `log_scale` (bool).
  - It is written by `Chart::saveView` in a fixed key order, kept compatible with the Python app.
  - It is read by `Chart::viewSettings` and `api/view-range.php`.
  - `panel.js` builds the checkbox `#log-scale-toggle` and posts `{log_scale}`.

## Goals / Non-Goals

**Goals:**
- One mode value (`linear` / `log` / `ma200` / `log_ma200`) derived from three checkboxes, so that later measures can be added as further checkboxes with a value transform.
- Linear and log modes behave exactly as before.

**Non-Goals:**
- No drawdown or rolling-change modes yet.
- No user-selectable window length; 200 is a constant.
- No deviation mode in the minute chart.

## Decisions

### Mode state and persistence
- `chart.js` keeps a `scaleMode` variable, initialized from a server value. `Chart.php` puts `scale` in the layout `meta`, or reads it from `viewSettings()`.
- `window.setStockChartScale(mode)` replaces `setStockChartLogScale`.
- `viewSettings()` returns `['scale' => 'linear'|'log'|'ma200'|'log_ma200']`:
  - from a valid `scale` key if there is one
  - otherwise `log_scale === true` gives `log`
  - otherwise `linear`
- `saveView` writes the key order `start, end, log_scale, scale`. On a scale change it writes both `scale` and `log_scale = (scale === 'log' || scale === 'log_ma200')`, so that older readers, including the Python app, still get a sensible linear or log choice.
- `api/view-range.php` accepts `scale` with one of the four values, and still accepts `log_scale` for compatibility.
- *Alternative:* overloading `log_scale` with a string. This was rejected because it would break the bool contract that the Python format and the tests rely on.

### Deviation series computed once in the browser
- For every stock trace, a rolling-sum pass over `customdata[i][0]` gives `ma200[i]`, which is null for `i < 199` and for non-positive prices. From that, `deviation[i] = (price / ma200 − 1) × 100`.
  - The result is cached per trace index, because the series only change on a page reload.
  - The cost is O(n) per stock, which is cheap for about 4 000 days × up to 50 stocks.
- For each purchase marker, the deviation of the stock on the marker's date, or the last date on or before it, is looked up in the stock's cached series.
- *Alternative:* computing on the server in `Chart.php`. This was rejected because the data would roughly double and `chart.js` already owns the y-transforms. Keeping it in the browser keeps the server unchanged apart from the setting.

### Rendering in ma200 mode
- `rebaseToVisibleStart` sets y to the deviation series instead of the rebased index when `scaleMode === 'ma200'`. `visibleBases` is still updated, but only the price-based features use it.
- The axis uses the same path as linear: shared `yaxis`, linear, title `Avvikelse från 200-dagars medel (%)`, tick suffix `%`. `fitYRange` gets the visible deviation values.
- The 0 % reference line is a shape added in `comparisonOverlays` when `scaleMode === 'ma200'`: `xref: 'paper'`, a grey solid line.
- The hover template for stock traces in this mode is `"<label>: %{customdata[1]}<br>Avvikelse: %{y:+.1f} %"`. The original template is restored when the mode is left. The templates are stored per trace at init.
- Comparisons keep `price1`/`price2` and the label computation unchanged, but their y-values come from a helper `yForPrice(curve, x, price)`:
  - `price / base × 100` in linear and log mode
  - the deviation at date `x` in ma200 mode
  - The `firstComparisonPoint` annotation uses the same helper.
- The break-even block in `comparisonOverlays` is skipped when `scaleMode === 'ma200'`.

### Log + deviation (`log_ma200`)
- **Deviation traces.** At init, `chart.js` appends one deviation trace per stock trace with `Plotly.addTraces`:
  - `meta.role = 'deviation'` and the stock's `ticker`
  - `x` and `customdata` from the stock, and `y` = the cached deviation series
  - the stock's line color, `width: 1` and `dash: 'dot'`
  - the hover template `"<label> avvikelse: %{y:+.1f} %"`
  - `visible: false`
  - Appending at the end keeps every existing trace index (and `visibleBases`, `stockTraceByTicker` and the solo snapshots) unchanged.
- **Deviation axis.** The axis has `tickmode: 'auto'`; otherwise Plotly syncs an overlaying axis's ticks to the log base axis and the percent ticks come out uneven. The traces use their own axis `yaxis<N+1>`, where N is the number of stocks. It is `overlaying: 'y'`, `side: 'left'` and linear, with the title `Avvikelse från 200-dagars medel (%)` and the tick suffix ` %`. It is visible only in `log_ma200`; in that mode the title of the base log axis is cleared, so that only the deviation title shows on the left. `refreshVisibleView` fits its range to the visible deviation values of the shown stocks. The 0 % line uses this axis as `yref` in `log_ma200`.
- **Visibility.** `syncDeviationTraces()` makes a deviation trace visible exactly when the mode is `log_ma200` and its stock trace is shown. It is called after every mode switch and from the existing `plotly_restyle` visibility handler. It ignores restyles that only touch deviation traces, so that it does not loop.
- **Excluded from stock logic.** Every existing code path that treats traces as stocks or purchases already filters on `meta.role` (`stock` / `purchase`); the deviation role is added where a path does not:
  - `applyVisibility`, `setSolo` and `toggleTicker` keep deviation traces out of their snapshots and maps
  - the click handler ignores points on deviation traces, so they never start a comparison or fill the form
  - `rebaseToVisibleStart` skips them first in its loop, before it reads `customdata`, which they do not have. Their values do not depend on the visible range
- **Break-even, markers and comparisons** use the log price curves exactly as in log mode, because `scaleMode` is not `ma200`.
- *Alternative:* adding and removing the traces on each mode switch. This was rejected because deleting traces renumbers later traces, and appending them once at init is simpler.

### Switching modes
- `setStockChartScale(mode)`:
  1. sets `scaleMode`
  2. calls the existing `applyAxisMode(mode === 'log' || mode === 'log_ma200')` for the axis structure
  3. relayouts the y-axis title and tick suffix
  4. restyles the hover templates
  5. shows or hides the deviation axis and calls `syncDeviationTraces()`
  6. calls `rebaseToVisibleStart({})`, so that every y-value is recomputed for the new mode and `refreshVisibleView` refits the axis and the overlays

### Adding a purchase
- `panel.js` places a newly added purchase marker at `price / base × 100` and did not rebase afterwards. It now calls `window.rebaseVisibleStockGraph({})` after `extendTraces`, so that the marker also lands on the deviation curve in ma200 mode.
- The deviation cache is invalidated when a trace's `customdata` length changes, for example after new closing prices.

### UI
- `panel.js` builds `Skala` from three checkboxes: `#scale-linear` (`Linjär`), `#scale-log` (`Logaritmisk`) and `#scale-ma200` (`Avvikelse från 200-dagars medel`).
- The rules are applied in one change handler:
  - checking `Linjär` clears the other two
  - checking `Logaritmisk` or `Avvikelse` clears `Linjär`
  - if no box is left checked, `Linjär` is checked
- The mode is then `linear`, `log`, `ma200` or `log_ma200`, computed from the boxes. The handler calls `setStockChartScale` and posts `{scale}`. A failed save shows the same status message as today.
- *Alternative:* a select with four options. This was rejected because the user asked for checkboxes, which also extend naturally when further measures are added.

## Risks / Trade-offs

- [Mode-specific branches spread across `rebaseToVisibleStart`, `refreshVisibleView` and `comparisonOverlays`] → They are funnelled through two helpers (`yValuesFor(trace)` and `yForPrice`), so that a later mode only adds a transform there.
- [A short history (< 200 days) gives an empty curve] → This is accepted per the spec. The legend and the tables are unaffected.
- [The Python app reading `aktievy.json` with `scale: "ma200"` or `"log_ma200"`] → It gets `log_scale` false or true, so it falls back to linear or log. Unknown keys are ignored as before.
- [Log + deviation doubles the number of drawn lines] → The deviation lines are thin and dotted, and they are only shown for visible stocks. The user can hide stocks or choose a single mode.
- [The `x unified` hover lists twice as many rows in log + deviation] → This is accepted. Each stock gets one extra row with its deviation.
- [Hover for purchase traces still says what it says today (type, price)] → This is unchanged and correct in every mode.
