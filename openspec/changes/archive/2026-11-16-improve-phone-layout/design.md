## Context

See proposal.md for motivation and specs/aktiediagram/spec.md for the behavior.

- **Page structure.** `public/assets/panel.js` builds `#stock-chart-layout`, a flex column, and appends to it the title, `#top-controls-row` (form and refresh/date controls), `#stock-chart-viewport` (main chart and legend), `#intraday-panel` and `#transaction-tables`.
- **Existing CSS.** `@media (max-width: 900px)` already stacks the legend under the chart and the tables in one column. Many blocks have `margin-left: 92px`, to line up with the plot's left margin.
- **Main chart layout.** `private/src/Chart.php` sets `margin.r = 145`, `yaxis.title = 'Index (100 = synligt startdatum)'` and `meta.scale`.
- **Curve end labels.** `comparisonOverlays` in `chart.js` builds them with `x` = the last visible date, `xanchor: 'left'`, `ax: 28` and a vertical `ay` from the overlap slots, so they sit in the right margin.
- **Solo.** `setSolo(ticker, checked)` in `chart.js` shows the minute chart through `showIntraday`. The legend's solo checkboxes have `aria-label="Visa endast <namn>"`.
- **`aktievy.json`.** It is written by `Chart::saveView` with a fixed key order (`start, end, log_scale, scale`), through `api/view-range.php`.

## Goals / Non-Goals

**Goals:**
- A phone-first order and density, using CSS only plus one load-time auto-solo.
- A wider main chart on every screen.

**Non-Goals:**
- No separate mobile page and no user-agent sniffing. The layout is decided by width alone.
- No change to the minute chart's own controls.
- No auto-solo on desktop.

## Decisions

### Phone detection
- `@media (max-width: 600px)` in CSS, and `window.matchMedia('(max-width: 600px)').matches` in JavaScript, evaluated once at load for the auto-solo.
- 600 px covers phones in portrait (about 375–430 px). A phone in landscape (> 600 px) gets the existing ≤ 900 px tablet layout.

### `last_solo`
- `saveView` adds `last_solo` last in its key order. `viewSettings()` returns it when it is a non-empty string.
- `view-range.php` accepts `{last_solo}` and validates it against `Stocks::load()` tickers. An unknown ticker is rejected with 400.
- The layout `meta` gets `lastSolo` only when the ticker is in the current stock list.
- `chart.js` posts `{last_solo: ticker}` in `setSolo` when `checked`. It is fire-and-forget, and a failure only logs to the console, since it is a convenience.
- On init, if `meta.lastSolo` is set, the phone media query matches, and the stock has a curve, `chart.js` calls `setSolo(lastSolo, true)` after the first rebase. It also ticks the matching legend checkbox, so that the legend shows the state.
- *Alternative:* `localStorage`. This was rejected because the choice is then not shared between devices, and the user may pick a stock on the desktop and look at it on the phone.

### Order and density on the phone (CSS only)
- `#stock-chart-layout > #intraday-panel { order: -1; }` places the minute chart first. The other blocks keep their DOM order: title, top controls, chart and legend, tables. The proposal's order (main chart, legend, form, tables) needs the form after the chart, so `#top-controls-row { order: 1 }` and `#transaction-tables { order: 2 }`.
- Fonts: `body, table, #intraday-panel, #transaction-tables > section { font-size: 13px }` and headings 16 px. The minute chart is 300 px high.
- The `margin-left: 92px` blocks become `0`, and their widths become `100%`.

### Labels inside the plot and no index title (every screen)
- **End labels** use `xanchor: 'right'` and `ax: -10` (a short leader line to the left). They keep `ay` from the slot computation and the semi-transparent background, so they stay readable over the curves.
- **Margins:** `Chart.php` sets `margin.r` to 20. The breakeven label stays at the left edge (`x: 0`) and does not collide with the end labels at the right.
- **Index title:**
  - `Chart.php` sets the linear y-axis title to `''`.
  - `linearYAxisTitle` in `chart.js` reads that empty title, so switching back to linear keeps it empty.
  - The titles for log and the measures are untouched.
  - The left margin drops automatically, because Plotly sizes it to the axis title.

## Risks / Trade-offs

- [Labels inside the plot can cover the last part of other curves] → They are short, have a semi-transparent background and keep the overlap avoidance. This is the trade-off the user asked for.
- [Auto-solo on a phone changes the transaction and result lists] → This is consistent with the existing "Filtrera aktier enligt solo-val" behavior, and the user can turn solo off.
- [Saving `last_solo` on every solo selection rewrites `aktievy.json`] → The write is small and atomic, like the date-range saves.

## Problem found after upload: cached assets on iPhone

- **Symptom.** After the upload the user's iPhone showed neither the auto-solo nor the phone order. The page itself is served with `Cache-Control: no-store`, but `assets/app.css` and the JavaScript files had fixed URLs. Safari kept using cached old copies, which have neither the 600 px CSS block nor the auto-solo code.
- **Fix.** `asset_url($path)` in `public/_bootstrap.php` appends `?v=<filemtime>`. `index.php` and `login.php` use it for `app.css`, `chart.js`, `intraday.js`, `panel.js` and `app.js`. Every upload changes the modification time, so browsers fetch the new file. The vendored Plotly file already has its version in the file name.
- **One-off effect.** The first load after this upload still needs the new `index.php`. That always happens, because the page is `no-store`. `last_solo` is only set after a solo has been selected with the new `chart.js`.

## Follow-up after the user tested on the iPhone

- **Landscape.** The phone layout uses one query in CSS and JavaScript: `(max-width: 600px), (pointer: coarse) and (max-height: 500px)`. A landscape phone (about 844 × 390 px, touch) matches. A desktop window with a low height does not, because it has `pointer: fine`, and neither does an iPad, because its height is greater than 500 px.
- **Minute chart.** In the phone layout, `intraday.js` draws the y-axis without a title, with a smaller left margin (48 px instead of 92 px) and with `tickfont.size` = 30 % of Plotly's default 12 px (≈ 4 px).
- **Main chart.** `chart.js` relayouts `xaxis.tickfont.size`, `yaxis.tickfont.size` and the measure axis's tick font in the same way when the phone layout is active.
- **Rotation.** Both charts listen to the media query's `change` event and reapply or restore the tick fonts and the minute chart's title and margin, so that rotating the phone needs no reload. The auto-solo still only happens at page load.
- **Tick size.** The tick size factor is the constant `PHONE_TICK_FACTOR = 0.3`, chosen by the user as "30 % av storleken" after being told that about 4 px may be hard to read. It is easy to change.

## Second follow-up: titles, status line and archive text

- **Titles on the phone.** In the phone block, `#stock-chart-title` and `#intraday-title` get `font-size: 8px`, half of the 16 px heading size used elsewhere in the phone layout. The other headings stay at 16 px.
- **Archive text next to the download link.**
  - `index.php` wraps the link in `<span id="intraday-download-row">` together with a new `<span id="intraday-archive">`, so that the archive text follows the link on the same line (`white-space: nowrap` on the row).
  - `archiveText()` returns `Arkiv: <first> – <last>, <n> nya.`, without the minute count. It returns `Arkiv: inga minuter` when the archive is empty, and the existing skip or error texts.
  - Errors keep `is-error` styling on the archive span.
- **Status line.** It becomes `Senaste kurs <time>: <price> <currency>`, with the price from `data.close` at the last index, formatted with `formatAmount` (2 decimals), and `SEK` shown as `kr`. Warnings still follow.
- **Archive requirement.** The requirement "Arkiv med minutkurser" (from the archived change `add-intraday-csv-archive`) is MODIFIED in this change's delta, so that it describes the new placement and wording.
