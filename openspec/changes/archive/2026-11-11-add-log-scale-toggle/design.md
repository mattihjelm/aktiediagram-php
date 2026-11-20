## Context

The chart is a Plotly 4.1.1 figure built in `private/src/Chart.php` and driven by `public/assets/chart.js`. The curves are indexed to 100 in the browser (`rebaseToVisibleStart`), and every rebase or visible-range change computes `targetYRange` linearly (min/max of the visible values ± 5 %, at least 1) and sets `yaxis.range`. `comparisonOverlays` places the end labels by converting y-values to pixels linearly from the range, and `handleGraphClick` picks the nearest curve by converting the pointer position linearly. The date fields are created in `panel.js` under `#visible-date-controls`. `aktievy.json` holds `{"start", "end"}` and is written by `Chart::saveVisibleRange` through `api/view-range.php`.

## Goals / Non-Goals

**Goals:**
- Switch the y-axis between linear and logarithmic without reloading or refetching data.
- Keep range fitting, end labels and click selection correct on both scales.
- Remember the choice across sessions and devices.

**Non-Goals:**
- No change to indexing, hover text, results or comparisons.
- No per-stock axes in linear mode; there all curves share one axis, as in the Python version.
- No log scale on the rangeslider's mini chart beyond what Plotly does automatically.

## Decisions

- **One hidden log axis per stock, with a common span.** In log mode each stock trace and its purchase trace are moved to their own axis (`yaxis2`…`yaxisN`) with `overlaying: 'y'`, `type: 'log'` and `visible: false`. The first stock keeps the main `yaxis`, because Plotly drops an axis that no trace uses and the overlays need it. The main axis hides its tick labels and grid, and its title becomes "Egen logaritmisk skala per kurva". `refreshVisibleView` computes each stock's min/max in log10 units within the visible window. The span is the largest (max − min) among the visible stocks plus 5 % padding (at least 0.01). Each axis gets that span centred on its own stock's midpoint, so equal percentage moves are equally tall. Hidden stocks also get ranges, and the span is recomputed after visibility changes. The linear mode keeps the single shared axis from the Python version.
  - *Alternatives tried:* one shared log axis, which hardly changed the picture because index values are relative, and per-stock axes fitted to each stock's own min/max, which stretched every curve to full height and hid the difference in size between moves.
- **Plotly `yaxis.type: 'log'`.** Plotly then expects `yaxis.range` in log10 units. A single helper converts values to axis units (`toAxis(v)` = `Math.log10(v)` on the log axis, `v` on the linear one). `targetYRange` is computed from the visible values in axis units, with 5 % padding of the span in axis units. The minimum padding of 1 applies only on the linear axis; on the log axis the minimum is a small log span, for example 0.01. `comparisonOverlays` (end labels and comparison annotations) and `handleGraphClick` use the same helper, so pixel positions and distances are right on both scales. Shapes (the comparison lines) are the exception: Plotly 4.1.1 places them by data value even on a log axis, so they keep the index values. This was verified in the browser. Indexed values are always positive (price / start price × 100), so the logarithm is defined. Non-positive or missing values are skipped when the range is computed.
  - *Alternative:* plotting log10 values on a linear axis. Rejected: hover, ticks and labels would show logarithms instead of index values.
- **Changing the axis.** On change, a `Plotly.relayout` sets `yaxis.type`, and then the existing `refreshVisibleView` computes the new range and labels. That function is the same path the date-range change already takes.
- **Persistence in `aktievy.json`.** A new optional key `log_scale` (bool) is stored next to `start`/`end`. `Chart::visibleRange` keeps reading only the dates. A new `Chart::viewSettings()` returns `log_scale` (false if missing or not a bool). `saveVisibleRange` and the new save path read the existing file under the same lock and preserve the other keys, so a date change does not reset the scale and vice versa. The file keeps 2-space JSON indentation and the existing key order (`start`, `end`, then `log_scale`). Old files without the key still work, and Python's reader ignored unknown keys.
  - *Alternative:* `localStorage`. Rejected: the setting would not follow the user to other devices, and the date range is already stored on the server.
- **API.** `api/view-range.php` accepts an optional `log_scale` (bool) in the same POST. Only the keys that are sent are updated. A dedicated endpoint is not needed.
- **Initial render.** `Chart.php` sets `layout.yaxis.type` from the setting, so the first render is already on the right scale, and `panel.js` sets the checkbox from `figure.view.log_scale` (or the layout's axis type).
- **Placement.** The checkbox is a `label` with an `input type="checkbox"` inside `#visible-date-fields` after the end field, aligned to the bottom with the date fields. On narrow windows it wraps together with the other controls.

## Risks / Trade-offs

- [Linear-unit assumptions elsewhere in `chart.js`] → Search for every use of `yaxis.range` and `_fullLayout.yaxis` and route them through the helper. Then manually test click selection, end labels and comparisons on the log axis.
- [Simultaneous saves of date and scale overwriting each other] → Both are written with a read-modify-write under the same exclusive lock.
- [Plotly rangeslider with a log axis] → The rangeslider follows the x-axis, and its mini chart keeps its own y-scaling. Check visually that it still looks right.
