## Why

On an iPhone the app works, but the layout is built for a desktop: the minute chart comes far down below the main chart and the tables, the text is large, and wide left indents and a 145 px right margin for curve labels take space from the charts. The user wants the minute chart for their latest solo stock at the top on the phone, with smaller text and everything else below. On every screen, they want the left y-axis text `Index (100 = synligt startdatum)` hidden and the curve labels inside the main chart instead of to the right of it.

## What Changes

- **Last solo stock remembered:** the app remembers the latest stock selected as solo, saved in `aktievy.json` as `last_solo`. Turning solo off does not clear it, and a stock no longer in `aktier.csv` is ignored.
- **Phone layout** (width at most 600 CSS px, for example an iPhone in portrait):
  - When the page opens, the last solo stock is selected as solo automatically, so the minute chart is shown.
  - The minute chart is placed first on the page, above the main chart. The main chart, the legend, the form, `Resultat` and `Transaktioner` follow below, in that order.
  - Smaller text: 13 px for body text and tables, and smaller headings.
  - The 92 px left indents for the panels and tables are removed. Tables scroll sideways inside their own area, as today.
- **Every screen:**
  - The y-axis title `Index (100 = synligt startdatum)` is not shown in linear mode. The page title already states the indexing.
  - The axis titles of the measures and of the log scale stay, because they explain what the y-values mean.
  - The curves' end labels are placed inside the plot area, to the left of each curve's end point, with their thin leader lines and the existing overlap avoidance.
  - The main chart's right margin shrinks from 145 px to about 20 px, so the plot gets wider.
- **Follow-up after testing on the iPhone:**
  - In the phone layout, the page title and the minute-chart title are half the size of the other headings.
  - On every screen, the status line shows the latest price, for example `Senaste kurs 2026-11-16 15:42: 641,40 kr`.
  - On every screen, the archive text follows `Ladda ner CSV` on the same line, for example `Arkiv: 2026-10-13 11:03 – 2026-11-16 15:42, 380 nya.`, without the minute count.
  - This modifies the requirement "Arkiv med minutkurser" and adds "Senaste kurs i minutdiagrammets statusrad".
- **Desktop:** the order, the font sizes and the solo behavior on page load are unchanged. Desktop does not auto-select the last solo stock.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `aktiediagram`: adds the requirements "Senast valda solo-aktie", "Layout på telefon" and "Kurvetiketter inne i huvuddiagrammet". The existing requirement "Kurvornas synlighet och legend" (leader lines, no overlap) still holds, and it is not changed.

## Impact

- `private/src/Chart.php`:
  - `saveView`/`viewSettings` accept and return `last_solo`, written last in `aktievy.json`.
  - The layout no longer has the y-axis title text, and `margin.r` is smaller.
  - The saved `last_solo` is passed to the browser in the layout `meta`.
- `public/api/view-range.php`: accepts `last_solo`, validated against `aktier.csv`.
- `public/assets/chart.js`:
  - It saves `last_solo` when solo is selected, and selects it on page load on a phone.
  - The end-label annotations are placed inside the plot.
  - The linear title becomes empty.
- `public/assets/app.css`: a `@media (max-width: 600px)` block for order, fonts and indents.
- `private/tests/run.php`: tests for `last_solo` in `aktievy.json`.
- No change to `aktier.csv` or `aktiekop.csv`.
