## Why

The deviation from the 200-day average shows ups and downs relative to the trend, but not how deep a fall from the top was. Berkshire's 2020 dip showed as −17,8 % rather than the roughly −25 % fall the user had in mind. The user asked for the two other measures discussed when the deviation mode was added: fall from the previous high, and change over a period. They should be chosen the same way, with checkboxes.

## What Changes

- `Skala` gets two more checkboxes after `Avvikelse från 200-dagars medel`: `Fall från tidigare topp` and `Förändring över 3 månader`.
- **Fall från tidigare topp:** `(kurs / högsta stängningskurs hittills − 1) × 100`, over the whole fetched history. It is 0 % at each new high and negative below it.
- **Förändring över 3 månader:** `(kurs / kurs 63 handelsdagar tidigare − 1) × 100`. The first 63 trading days of a stock's history have no value.
- The three measures (`Avvikelse`, `Fall från tidigare topp`, `Förändring över 3 månader`) exclude each other: checking one clears the others and `Linjär`.
  - Each can be shown alone, or combined with `Logaritmisk`, exactly like the deviation today.
  - Alone, the measure replaces the curves. Together with `Logaritmisk`, it is shown as thin dotted curves against a visible left axis in percent.
- The axis title, the hover text, the 0 % line, the marker positions, the comparisons and the hiding of the break-even line follow the chosen measure, in the same way as for the deviation.
- `aktievy.json` `scale` gets the values `drawdown`, `change63`, `log_drawdown` and `log_change63`. `log_scale` stays true for the `log_*` values.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `aktiediagram`:
  - The requirement "Logaritmisk skala" is modified: five checkboxes, with the rule that only one measure can be chosen at a time.
  - The requirement "Fall från tidigare topp och förändring över 3 månader" is added.
  - The requirement "Avvikelse från glidande medel" is unchanged. Its rules for showing the measure alone, or with `Logaritmisk`, are reused for the new measures.

## Impact

- `public/assets/chart.js`:
  - The deviation-specific code becomes generic for a "measure": series per measure (`ma200`, `drawdown`, `change63`), titles, hover labels and the measure traces in log mode.
  - The mode is split into `log` (bool) and `measure` (null or a measure).
- `public/assets/panel.js`: two more checkboxes, and the exclusion rule among the measures.
- `private/src/Chart.php` and `public/api/view-range.php`: the new `scale` values. `private/tests/run.php`: tests for them.
- No change to transactions, the minute chart or other data.
