## Context

See proposal.md for the motivation and specs/aktiediagram/spec.md for the behavior.

- **`chart.js` `renderCustomLegend()`:**
  - It rebuilds `#stock-custom-legend` from scratch every time: a sticky header (help text, `Solo`, `Aktie / resultat`) and then one row per stock.
  - Rows come in `Object.entries(stockTraceByTicker)` order, which is the order of `aktier.csv`.
  - It is called after visibility changes, solo and profit-label updates.
- **`refreshProfitLabel(ticker)`:**
  - It computes `profit`, `monthlyProfit` and `monthlyPercent` from the purchase trace.
  - It writes the text to `stockTrace.meta.profitLabel`, then renders the legend unless `render` is false.
  - Stocks without purchases have no label.
- **`aktievy.json`:**
  - It is written by `Chart::saveView`, which merges keys in a fixed order (`start`, `end`, `log_scale`, `scale`, `last_solo`).
  - It is read into `layout.meta` (`scale`, `lastSolo`).
  - `api/view-range.php` validates each key.

## Goals / Non-Goals

**Goals:**
- Sort the legend by `aktier.csv` order, by name, or by monthly percent, and remember the choice.
- Show a compounded annual percent after the monthly percent.

**Non-Goals:**
- No sorting of curves, colors or curve labels.
- No sorting of `Resultat` or `Transaktioner`.
- No annual figure for stocks without purchases. That would be a separate price-growth measure.
- No change to how the monthly return is calculated.

## Decisions

### Sort only the legend rows
- `renderCustomLegend` builds the row list as before and then orders it with a module-level `legendSort` (`none`, `name` or `monthly`):
  - `name`: `a.displayName.localeCompare(b.displayName, 'sv')`, which places Å, Ä and Ö after Z.
  - `monthly`: descending by `meta.monthlyPercent`. Stocks without the value come last, and ties keep `aktier.csv` order through the original index.
  - `none`: `aktier.csv` order.
- **Why only the DOM:** `stockTraceByTicker`, the trace indices and the log axes depend on the trace order, so the traces are left alone.
- **Re-sort:** `refreshProfitLabel` already re-renders the legend after a recalculation, so `monthly` re-sorts on its own.

### Buttons in the header
- A small button group (`Osorterad`, `Namn`, `%/mån`) goes on its own line in the sticky header, under the help text.
- The active button gets `aria-pressed="true"` and a marked style.
- A click sets `legendSort`, re-renders and saves through `api/view-range.php` (`{legend_sort: …}`) with the existing `apiFetch`. Errors are logged with `console.warn`, like `saveLastSolo`.
- On phones the buttons use the same 13 px text as the rest of the legend.

### Persist as `legend_sort`
- `view-range.php` accepts `legend_sort` in `['none', 'name', 'monthly']` and returns 400 otherwise.
- `saveView` appends `legend_sort` to its key order.
- `Chart.php` puts `meta.legendSort` in the figure when the saved value is valid.
- The browser starts with `meta.legendSort || 'none'`.

### Annual percent
- `monthlyPercent` is stored as a number on `stockTrace.meta.monthlyPercent`, or null.
- When it is above −100: `annual = (Math.pow(1 + m / 100, 12) - 1) * 100`, appended as `· <signed>%/år` with two decimals.
- Otherwise the label is unchanged.
- *Alternative:* simple ×12. The user chose the compounded rate.

## Risks / Trade-offs

- [A legend sorted by `%/mån` moves while prices update] → It only re-sorts on recalculation. The rows are short, and the current choice stays marked.
- [Very large annual numbers for short holding periods] → They are shown as calculated. The monthly figure already has the same sensitivity.
- [Plotly redraws are not involved] → Sorting only touches the legend DOM, so no extra Plotly calls are made.
