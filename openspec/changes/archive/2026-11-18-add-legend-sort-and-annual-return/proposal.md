## Why

The stock legend now holds many stocks in the order of `aktier.csv`. That makes it hard to find a stock by name or to see which holdings have done best. The legend shows each held stock's return per month, such as `+1,50%/mån`, but not what that pace means over a year.

## What Changes

- Three sort buttons in the legend header: `Osorterad` (the order in `aktier.csv`, as now), `Namn` (alphabetical in Swedish order) and `%/mån` (highest monthly return first, stocks without a value last in `aktier.csv` order).
  - The active button is marked.
  - The choice is saved in `aktievy.json` as `legend_sort` and used at the next start.
  - It only changes the legend order. Curves, colors, labels, lists and `aktier.csv` are unchanged.
- The monthly return in the legend is followed by an annual rate compounded from it: `(1 + m)^12 − 1`. The label becomes `+1,50%/mån · +19,56%/år`.
  - It is shown only for stocks that already show a monthly percent, which means stocks with purchases.
  - It is not shown when the monthly value is missing (`—/mån`) or −100 % or lower.
- When the order is `%/mån`, the legend re-sorts when returns change, for example after a new transaction or a price update.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `aktiediagram`:
  - "Kurvornas synlighet och legend" gets the sort buttons and saved order.
  - "Beräkna resultat per aktie" gets the annual percent.

## Impact

- **Browser:**
  - `public/assets/chart.js`: `renderCustomLegend` (sort buttons and row order) and `refreshProfitLabel` (annual percent, and a numeric monthly value kept on the trace meta for sorting).
  - `public/assets/app.css`: button styles.
- **Server:**
  - `public/api/view-range.php`: accepts `legend_sort` (`none`, `name` or `monthly`).
  - `private/src/Chart.php`: `saveView` key order and `meta.legendSort`.
  - `private/tests/run.php`
- **Data:** `aktievy.json` gets an optional `legend_sort` key, and older readers ignore it. The `aktier.csv` and `aktiekop.csv` formats are unchanged.
