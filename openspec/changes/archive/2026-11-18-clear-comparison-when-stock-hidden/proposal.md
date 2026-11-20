## Why

Two clicks on the same curve in the main chart create a comparison label: the stock's name, the percent change, the change per month and the elapsed months, drawn with two horizontal lines and one vertical line. Today the label stays until the user double-clicks outside the curves.

When the user hides that stock, or selects solo for another stock, the label belongs to a curve that is no longer shown, so it is noise. The user wants it removed in those cases, and wants Playwright tests for it.

## What Changes

- **Removed when the curve is hidden:** when a stock's curve becomes hidden, its comparison labels and lines are removed, together with a started comparison (the first clicked point) on that curve. This happens when:
  - the user clicks the stock's name in the legend
  - the user checks solo for another stock
- **Kept otherwise:**
  - comparisons on other, still-visible curves
  - comparisons on the same stock when solo is checked for that stock
- **Not restored:** a removed comparison does not come back when the curve is shown again, for example after unchecking solo.
- **Fixed double-click clear:** a double-click outside the curves is supposed to clear all comparisons, but it never worked. The chart listened for the browser's `dblclick`, which Plotly's mouse handling in the plot area prevents. It now listens for Plotly's own `plotly_doubleclick`. A double-click within 600 ms of a click that picked a curve point counts as a click on the curve and clears nothing.
- **New Playwright spec `e2e/comparison.spec.js`:**
  - two clicks on a curve create a label with the stock's name and `%`, `/månad` and `mån`
  - hiding that stock in the legend removes it, while a label on another curve stays, and showing the stock again does not bring it back
  - solo on another stock removes it, and unchecking solo does not bring it back
  - solo on the same stock keeps it
  - a started comparison (one click) on a stock that is then hidden is cleared
  - a double-click outside the curves clears everything, and a double-click on a curve does not

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `aktiediagram`: "Kursinformation och jämförelsemarkeringar" says when comparisons are removed, with three new scenarios.

## Impact

- **Browser:** `public/assets/chart.js` removes comparisons for curves that become hidden, in the shared visibility path used by legend clicks and solo, and clears comparisons on `plotly_doubleclick`.
- **Tests:** new `e2e/comparison.spec.js`, plus a helper for clicking a curve point in the main chart, and a README note.
- **Server and data:** no changes.
