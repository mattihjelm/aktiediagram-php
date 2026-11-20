## Why

All curves are indexed to 100 at the visible start date and drawn on a linear y-axis. Over long intervals a stock that has grown many times flattens the others, and equal percentage moves look different depending on the level. A logarithmic scale shows relative development comparably over the whole interval.

## What Changes

- A checkbox `Logaritmisk skala` placed to the right of the `Datumintervall` fields (start and end) above the chart.
- When it is checked, the chart's y-axis uses a logarithmic scale. Indexing to 100, hover values, legend results and comparisons are unchanged. Only the axis scale changes.
- Automatic y-range fitting to the visible curves, the end labels and click selection of the nearest curve also work on the logarithmic axis.
- The choice is saved together with the date range in `aktievy.json` and restored when the app is opened again. The file keeps its existing `start`/`end` keys; the new key is optional.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `aktiediagram`: new requirement `Logaritmisk skala` alongside `Historiska kurser och indexerat jämförelsediagram`. Existing requirements are unchanged.

## Impact

- `public/assets/panel.js`: the checkbox in `#visible-date-controls`.
- `public/assets/chart.js`: y-axis type, y-range calculation, end-label placement and click distance in log units.
- `public/assets/app.css`: placement of the checkbox.
- `private/src/Chart.php`: read and write the optional setting in `aktievy.json`, and set the initial axis type in the figure.
- `public/api/view-range.php`: accept the setting, or a small separate API for the view setting.
- `private/tests/run.php`: tests for reading and writing `aktievy.json` with and without the new key.
