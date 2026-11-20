## Context

See proposal.md for motivation and specs/aktiediagram/spec.md for the behavior.

`public/assets/intraday.js` draws the minute chart with Plotly. The chart has one SVG `scatter` trace over `data.times` (Swedish-time strings) and `data.close`. Time without trading is hidden with gap-based `xaxis.rangebreaks`. `relayoutX(from, to)` sets the x range and fits the y range, and a `plotly_relayout` handler refits y after mouse zoom. Points are addressed by index into these arrays. Index ± 1 is exactly "the previous/next minute with a price", because minutes without a close were already dropped on the server.

## Goals / Non-Goals

**Goals:**
- Exact, keyboard-driven minute selection, done entirely in the browser in `intraday.js`.

**Non-Goals:**
- No pinned point in the main chart. Its click already creates comparisons.
- No comparison between two pinned minutes, and no step sizes larger than one minute.
- The pin is not persisted across page loads or solo switches.

## Decisions

### The pin is an index, drawn as a marker trace plus a line shape
- The state is `pinnedIndex` (or `null`).
- A second trace (`mode: 'markers'`, one point, `hoverinfo: 'skip'`) shows the dot, and a layout shape draws the vertical line at the pinned time across the plot (`yref: 'paper'`).
- Both are updated with `Plotly.restyle` and `Plotly.relayout` on each step, without redrawing the 10 000-point trace.
- *Alternative:* Plotly's own `selectedpoints` styling. This was rejected because it dims every other point, and a 1-point selection on a line is hard to see.

### The popup is an HTML element positioned from the axis conversion
- `#intraday-pin` is an absolutely positioned box inside `#intraday-chart`'s wrapper. It contains the time, the price and the `◀`, `▶` and `×` buttons.
- Its pixel position comes from `chart._fullLayout.xaxis.d2p` / `yaxis.d2p` plus the plot offsets (`_size.l`/`t`). This handles rangebreaks correctly. The main chart's end labels already use the same internal API.
- The position is recomputed after every step and after every `plotly_relayout` (zoom, `Vecka`/`Månad`, resize).
- The popup is placed to the left of the point and above it, because Plotly's hover label appears to the right of the pointer. Near the left or top edge it flips to the right or below, so it stays inside the chart.
- *Alternative:* a Plotly annotation. This was rejected because annotations cannot hold clickable buttons.

### Key handling on document, guarded
- A `keydown` listener on `document` acts only when `pinnedIndex !== null` and the event target is not an `input`, `select`, `textarea` or contenteditable element.
- `ArrowLeft`/`ArrowRight` step and call `preventDefault()` so the page does not scroll. `Escape` closes the popup.
- The popup buttons are real `<button>`s, so they also work with Tab and Enter.
- *Alternative:* listening only when the chart has focus. This was rejected because a Plotly div does not take focus naturally, and the user expects the arrow keys to work right after clicking.

### Keeping the pin visible and handling range changes
- After a step, if the pinned time is outside the current x range, the code calls `relayoutX` with the same width, shifted so the point sits at the edge it crossed. The rangebreaks are respected because the shift is computed in milliseconds and Plotly maps the result. Inside hidden time the range just starts at the next visible minute.
- `applyDays()` keeps the pin if its time is within the new range and otherwise unpins.
- `showIntraday`/`hideIntraday` always unpin.

### Click handling
- `plotly_click` on the price trace sets `pinnedIndex = point.pointIndex`. Clicks on the marker trace are ignored, so clicking the pinned dot does not change anything.
- The minute chart uses `hovermode: 'x'`, so hover and click pick the minute under the pointer regardless of its height. The user does not have to hit the line exactly, and the pinned minute is the one the hover label was showing.

## Risks / Trade-offs

- [Plotly internals (`_fullLayout`, `d2p`) can change between versions] → The Plotly version is pinned (4.1.1, vendored), and `chart.js` already depends on the same API.
- [Global arrow keys could surprise someone using the keyboard elsewhere on the page] → They are active only while a point is pinned and never in form fields. `Esc` or `×` releases them.
- [The popup can cover the curve near the pinned point] → It is offset from the point and flips at the edges, and the vertical line still shows the exact minute.
