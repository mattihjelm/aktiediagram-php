## Context

See proposal.md for the scope.

- **Checkboxes:** `panel.js` builds `#scale-linear`, `#scale-log`, `#scale-ma200`, `#scale-drawdown` and `#scale-change63` in a `role="group"` labelled `Skala`.
- **`changeScale`** applies the exclusivity rules and calls `window.setStockChartScale(scale)`. The scale is `linear`, `log`, `ma200`, `drawdown`, `change63` or `log_<measure>`. It then posts `{scale}` to `api/view-range.php`, which also writes `log_scale`.
- **`chart.js` `setScale`:**
  - Log: sets `yaxis.type` to `log` with hidden tick labels and adds hidden overlaying axes per stock.
  - Measure alone: sets `yaxis.ticksuffix` to `' %'` and the title to the measure's title (`Avvikelse från 200-dagars medel (%)`, `Fall från tidigare topp (%)` or `Förändring över 3 månader (%)`).
  - Log + measure: adds overlay traces with `meta.role === 'measure'` and `meta.of = <ticker>` on a visible percent axis after the stock axes.
  - At start, the figure's `layout.meta.scale` comes from `aktievy.json` (`Chart::SCALES`). A legacy `log_scale: true` without `scale` gives `log`.
- **Fixture:**
  - `resetState()` writes `aktievy.json` with only `start` and `end`, so every test starts in `Linjär`.
  - The three stocks have two years of daily prices, enough for a 200-day average and a 63-day change.

## Goals / Non-Goals

**Goals:**
- Cover the checkbox rules, the saved value and the resulting chart state, offline and independent of order.

**Non-Goals:**
- No pixel or tick-spacing checks.
- No check of exact measure values beyond sign and presence. The PHP unit tests and earlier verifications cover the formulas.
- No change to app code.

## Decisions

### Read state, not pixels
- **Checkboxes:** read through `toBeChecked()` on the labelled checkboxes.
- **Chart:** read through `#stock-chart` `layout` and `data`:
  - `yaxis.type`, `yaxis.showticklabels`, `yaxis.ticksuffix` and `yaxis.title.text`
  - the stock traces' `yaxis`
  - the traces with `meta.role === 'measure'`, their `meta.of`, `visible` and axis
- **Saved view:** `readView()` is polled after each click, because the save is asynchronous.

### Measure traces always exist
- The measure overlay traces are in the figure in every mode, seeded so that Plotly never gets empty traces. They are only visible in `Logaritmisk` + a measure.
- So the tests count visible measure traces, not all of them. This was found on the first run.

### Drawdown sanity check
- In `Fall från tidigare topp` alone, every finite `y` of the visible stock traces must be ≤ 0 (with a 1e-9 tolerance). That is the definition of the measure and needs no expected numbers.

### Starting from a saved view
- **`writeView(view)`** writes `aktievy.json` in the fixture after `resetState()`.
- The reload test saves `log_drawdown` through the UI and reloads. The legacy test writes `{start, end, log_scale: true}` before login.

### Hiding a stock in log + measure
- A click on a stock name in the legend toggles it.
- The test then expects that stock's measure trace (`meta.of`) to be hidden (`visible` `false` or `'legendonly'`) and the others to stay visible.

## Risks / Trade-offs

- [Measure traces are added asynchronously after the checkbox change] → All chart reads use `expect.poll`.
- [A legend click writes visibility to `aktier.csv`] → `resetState()` restores it before the next test.
