## Context

See proposal.md for the motivation and specs/aktiediagram/spec.md for the behavior.

- **`chart.js` state:**
  - `comparisons` is a list of `{curveNumber, x1, x2, price1, price2, label}`.
  - `firstComparisonPoint` is null or the first clicked point `{curveNumber, …}`.
- **Drawing:** `comparisonOverlays()` builds the shapes and annotations from them. `Plotly.relayout(graph, comparisonOverlays())` redraws them.
- **Clearing today:** only a double-click outside the curves clears both.
- **Visibility changes:**
  - Solo and unchecking solo go through `applyVisibility(visibility)`, which restyles changed traces and then re-renders the legend.
  - A legend click without solo restyles the stock's traces directly in `toggleTicker`.
  - A legend click during solo goes through `applyVisibility`.
  - Registering a purchase makes the stock visible (`panel.js`), so it never hides anything.
- **Main chart hover:** `hovermode: 'x unified'`, `hoverdistance: 50`. A click picks the nearest visible stock curve.

## Goals / Non-Goals

**Goals:**
- Remove comparisons whose curve is hidden, on both the legend path and the solo path.
- Test it end to end.

**Non-Goals:**
- No restore of removed comparisons.
- No change to how comparisons are created or drawn.
- No change to the minute chart's pinned point.

## Decisions

### One helper after every visibility change
- **`dropHiddenComparisons()`:**
  - keeps the comparisons whose `graph.data[curveNumber]` is visible (not `'legendonly'` or `false`)
  - clears `firstComparisonPoint` when its curve is hidden, and resets the help text
  - returns whether anything changed
- **Where it runs:**
  - after the restyle in `applyVisibility` (solo on/off and legend clicks during solo)
  - after the restyle in `toggleTicker`'s non-solo path
- **Redraw:** when something changed, the helper calls `Plotly.relayout(graph, comparisonOverlays())`. Both paths already chain promises, so the relayout runs after the restyle, keeping Plotly calls sequential, as the earlier concurrency fixes require.
- **Why visibility and not "which stock was selected":** solo on another stock and hiding the stock both end in "curve hidden". Solo on the same stock keeps that curve visible, so the rule gives every requested case without special-casing solo.

### Double-click through Plotly's event
- **Found while testing:** the chart's `graph.addEventListener('dblclick', …)` never fires. In a probe, a real double-click on the plot area gave 0 native `dblclick` events on `window`, while Plotly emitted `plotly_doubleclick`. The config has `doubleClick: false`, so Plotly does not reset the axes, but it still emits the event.
- **The fix:** `graph.on('plotly_doubleclick', …)` clears all comparisons and the started point, as the old handler meant to.
- **Telling a curve from empty space:** `plotly_doubleclick` carries no mouse target, so the old "not on a curve" check (`closest('.scatterlayer .trace')`) cannot be used.
  - `handleGraphClick` instead stores `lastCurveClickAt` whenever a click picks a curve point, which happens within 80 px of a curve.
  - A double-click within 600 ms of such a click is a double-click on a curve and clears nothing.

### Test helper for clicking a point
- **`clickCurvePoint(page, ticker, date)`** in `e2e/helpers.js`:
  - finds the stock trace and the index of `date`
  - converts the point to page pixels with the graph's `_fullLayout` axes (`xaxis.d2p` and the trace's y-axis `d2p`, plus `_size.l`/`_size.t` and the graph's bounding box)
  - scrolls the chart into view, moves the mouse there and clicks
- The fixture's curves are smooth and well apart, so the nearest-curve rule picks the intended one. The test asserts the label's stock name.

### Reading labels
- Labels are read from `#stock-chart` `layout.annotations`. A comparison label is text that matches `<name>: [+−-]…%.*mån`, as opposed to the end labels, which are bare stock names.
- The number of comparison shapes is not asserted, only the labels.

## Risks / Trade-offs

- [A click lands on a neighbouring curve] → The test picks dates far apart on the held stock (`Alfa Test`), whose level differs from the others. It asserts the label text, so a miss fails clearly instead of passing by accident.
- [Comparisons on a stock hidden by a purchase or import] → Not possible, since those only make stocks visible.
- [A double-click in empty space within 600 ms of a curve click] → It is treated as a curve double-click and does not clear. This is rare in practice, and the user can double-click again.
