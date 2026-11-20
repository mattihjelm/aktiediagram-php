## Why

The list right of the chart now holds funds, stocks and ETFs, so "Aktie" is too narrow a word. The user wants:
- the list named `Värdepapperslistan`
- the column headings "Aktie" changed to "Värdepapper" in the list, `Resultat` and `Transaktioner`

The list can be sorted by `%/mån`, but not by the total return, which is now shown last on each line in `kkr`. The user wants a sort button for that.

## What Changes

- **New sort button `Total`** after `%/mån`:
  - sorts by total return converted to SEK with the latest exchange rate, highest first
  - stocks without a return come last, in `aktier.csv` order
  - saved as `legend_sort: "total"` and re-sorted when returns are recalculated, like `%/mån`
- **Naming in the list:**
  - The list's name for screen readers changes from `Aktielegend` to `Värdepapperslistan`. No new visible title, as the user chose.
  - The sort group's label becomes `Sortera värdepapperslistan`.
  - The column heading `Aktie / resultat` becomes `Värdepapper / resultat`.
- **Table headings:**
  - `Resultat`: `Aktie` → `Värdepapper`.
  - `Transaktioner`: `Aktie` → `Värdepapper`, including the sort label (`Värdepapper A–Z`) and the button's `aria-label`.
- **Unchanged:** the form's field `Aktie`, as the user chose.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `aktiediagram`:
  - "Kurvornas synlighet och legend": the name `Värdepapperslistan`, the heading `Värdepapper / resultat`, the `Total` sort and two new scenarios
  - "Kolumnrubriker i Resultat och Transaktioner": `Värdepapper` instead of `Aktie`
  - "Layout på telefon": the word "aktielegenden" becomes "värdepapperslistan". This delta is built on the version in `uniform-control-height-and-transaction-heading`, so that change must be archived first.

## Impact

- **Browser:**
  - `public/assets/chart.js`: the `Total` sort, `meta.totalSek` in `refreshProfitLabel`, the heading and the sort group label
  - `public/assets/panel.js`: the list's `aria-label` and the two table headings
- **Server:**
  - `private/src/Chart.php`: `LEGEND_SORTS` gets `total`
  - `public/api/view-range.php` accepts `total` through the same constant
  - `private/tests/run.php`
- **Tests:** `e2e/smoke.spec.js` (sort buttons) and a new `Total` test.
- **Data:** `aktievy.json` may hold `legend_sort: "total"`.
