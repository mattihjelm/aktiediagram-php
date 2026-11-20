## Why

On the indexed main chart, a 25 % dip from 2020 looks smaller than a 10 % dip in 2025, because the price level has grown since then. The logarithmic scale helps, but the curves still climb with their long-term trend. The user wants a view where only the relative ups and downs are shown, on a roughly horizontal curve, so that historical and recent movements can be compared directly. They also want to be able to choose among other such measures later (fall from previous high, change over a period). This change starts with the deviation from a moving average.

## What Changes

- **BREAKING (UI):** the checkbox `Logaritmisk skala` is replaced by `Skala` with three checkboxes: `Linjär`, `Logaritmisk` and `Avvikelse från 200-dagars medel`.
  - The allowed combinations are linear only, log only, deviation only, and log + deviation.
  - `Linjär` clears the other two, and `Logaritmisk` or `Avvikelse` clears `Linjär`. Unchecking the last one checks `Linjär`.
  - The linear and logarithmic modes behave exactly as today.
- With deviation only, each stock is shown as the percentage by which its closing price is above or below its own 200-trading-day moving average: `(kurs / medel − 1) × 100`.
  - The average uses the whole fetched history, so a day's value does not depend on the visible range.
  - The first 199 days of a stock's history have no value.
- All stocks share a linear y-axis in percent, with a reference line at 0 %. The axis is fitted to the visible values.
- The hover shows the stock's price and its deviation. The endpoint labels and the transaction markers are placed on the deviation curve.
- Comparisons still show the price change between the two clicked points, as today. Their lines are drawn at the deviation values.
- The break-even line from solo is not shown with deviation only, because a fixed price has no fixed level on this scale.
- With log + deviation:
  - The log curves are shown exactly as in log mode, including markers, comparisons and the break-even line.
  - Each visible stock also gets a thin dotted deviation curve in its own color, against a visible left y-axis in percent with a 0 % line.
  - The hover also shows the deviation. The deviation curves cannot be clicked, and they hide together with their stock.
- The choice is saved in `aktievy.json` as `scale` (`linear`, `log`, `ma200` or `log_ma200`), and `log_scale` is still written for compatibility (true for `log` and `log_ma200`). A file with only `log_scale` keeps working.
- The checkboxes are built so that further measures (`Fall från tidigare topp`, `Förändring över period`) can be added later as additional checkboxes. They are not part of this change.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `aktiediagram`:
  - The requirement "Logaritmisk skala" is modified: the checkbox becomes `Skala` with three checkboxes and fixed combination rules, and the saved setting is extended.
  - The requirement "Avvikelse från glidande medel" is added.
  - The requirements "Kursinformation och jämförelsemarkeringar" and "Nollpunktslinje i huvuddiagrammet vid solo" are unchanged in linear and log mode. The new requirement states their behavior in the deviation mode.

## Impact

- `public/assets/panel.js`: the three checkboxes and their rules replace the checkbox, and the choice is saved as `scale`.
- `public/assets/chart.js`:
  - computing the deviation series per stock
  - a mode switch next to the existing log handling (`applyAxisMode`)
  - y-values in `rebaseToVisibleStart` and `refreshVisibleView`, the hover template, the 0 % line, the marker positions and the comparison lines in deviation mode
  - the extra deviation traces and the visible left axis in log + deviation mode
- `private/src/Chart.php` and `public/api/view-range.php`: reading, validating and writing `scale`, and the initial axis on page load.
- `private/tests/run.php`: tests for reading and saving `scale`, including old files.
- No change to `aktiekop.csv`, `aktier.csv` or the minute chart.
