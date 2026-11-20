## Context

- **Rendering:** `chart.js` renders the list in `window.renderCustomLegend()`, which rebuilds the whole container: the header (help text, sort buttons, column headings) and one row per series.
  - It is called from many places: visibility toggles, solo, sort changes, `refreshProfitLabel` after current-price updates, and the in-place inserts in `panel.js`.
  - Rebuilding an `<input>` on each call would drop focus and the caret while the user types.
- **Sorting:**
  - `LEGEND_SORTS` in `chart.js` lists the buttons, and `legendEntries()` orders the series.
  - `monthly` and `total` read numbers stored on the stock trace's `meta` (`monthlyPercent`, `totalSek`) by `refreshProfitLabel`.
  - The server validates `legend_sort` against `Chart::LEGEND_SORTS`, both in `api/view-range.php` and when reading `aktievy.json` (`Chart::legendSort()`).
- **`Tot avkastn (%)`:** `Resultat` computes it in `panel.js` `renderPortfolioSummary()` from `holdingFrom(trace)`, as `profitSek / totalBuyCostSek × 100`, with realized and unrealized profit plus dividends in SEK. It is null when an FX rate is missing or nothing was bought.
- **Colours:** the name is `.stock-legend-name` `#263448`, and the profit line is `.stock-legend-profit` `#2b3646`. Hidden rows use `opacity: .48`.
- **Script order:** `chart.js`, `intraday.js`, `panel.js`, `app.js`. `panel.js` calls `renderCustomLegend()` in `finishStockChartLayout`, after its own functions exist.

## Goals / Non-Goals

**Goals:**
- `Total %` ranks by exactly the number shown in `Resultat`.
- Typing in the search field is never interrupted by a re-render.
- Search and sort combine.

**Non-Goals:**
- Showing the percent in the legend's profit line.
- Saving the search text.
- Filtering curves, `Transaktioner` or `Resultat` by the search.
- Fuzzy or accent-insensitive matching. Only a plain case-insensitive substring match.

## Decisions

### `Total %` sort
- **The button:**
  - `LEGEND_SORTS` gets `['total_percent', 'Total %']` after `total`
  - `Chart::LEGEND_SORTS` gets `'total_percent'`
  - no change in `view-range.php`, since it validates against the constant
- **The value:**
  - `panel.js` exposes `window.totalReturnPercent(series)`, which returns the same `profitSek / totalBuyCostSek × 100` as `Resultat`, or null
  - the computation moves into a small helper used by both `renderPortfolioSummary` and the new function, so the two cannot drift
- **The sort:** `legendEntries()` treats `total_percent` like `monthly` and `total`: highest first, null last, stable in `aktier.csv` order.
  - **Before the results exist:** the function is missing and every value counts as null. `finishStockChartLayout` runs while `panel.js` is still loading, before `window.totalReturnPercent` is assigned, so `panel.js` renders the list once more right after its first `renderPortfolioSummary()`. This was found during implementation, when a reload sorted every security as if it had no value.
- **Alternative rejected:** profit divided by invested, from `refreshProfitLabel`. That is in the security's own currency and ignores the FX history, so it could rank differently from the `Resultat` column the user compares with.

### Darker text
- `.stock-legend-name` `color: #1b2432`, and `.stock-legend-profit` `color: #1e2631`. Each is the old RGB channel × 0.7, rounded.
- The `.is-hidden` opacity is unchanged.

### Search field
- **The element:** an `<input type="search" id="stock-legend-search">` with a visible label `Sök värdepapper`, last in the header after the sort buttons, spanning the full width like `.stock-legend-sort`.
- **Re-rendering:**
  - `renderCustomLegend()` builds the header once and keeps it in a variable
  - on later calls it updates only the sort buttons' `aria-pressed` and replaces the rows after the header, so the input element, its value and its focus survive
- **Filtering:**
  - the query is `field.value.trim().toLocaleLowerCase('sv')`, matched with `includes` against `meta.displayName.toLocaleLowerCase('sv')`
  - an `input` event re-renders the rows
  - when no row matches, a `<p class="stock-legend-empty">Inga värdepapper matchar sökningen.</p>` replaces the rows
- **Not saved:** the query lives only in the input, so a reload starts empty.
- **No side effects:** the filter only skips rows while rendering. It never calls `toggleSeries`, `setSolo` or `refreshFilteredTables`.
- **Phone layout:** the field takes the full legend width with the control height used elsewhere. The phone legend is already a scrollable box with `max-height: 280px`. The header is sticky, so the field stays visible while scrolling.

## Risks / Trade-offs

- [A kept header can go stale, for example a stale `aria-pressed`] → The sort buttons' state is refreshed on every render, and Playwright checks it after a sort change made while a search is active.
- [`Resultat` and the legend recompute at different times] → `renderPortfolioSummary` already runs after price updates, and the legend re-renders through `refreshProfitLabel`. The percent is computed on demand at sort time, so it is never cached stale.
- [A sticky header with five buttons and a search field takes more height on a phone] → It wraps as today. The Playwright phone test checks there is no sideways scroll.
